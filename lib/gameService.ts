import { GoogleGenAI, Type } from "@google/genai";
import type { Chat, Schema } from "@google/genai";
import type { StoryNode } from "../types";

const generateSystemInstruction = (ipName: string, charName: string, startNode: string, ocProfile?: string) => `
你是一个无限流互动文字冒险游戏的“地下城主”（DM）。
本次游戏设定的背景世界是：**${ipName}**。
玩家扮演的角色是：**${charName}**。

${ocProfile ? `
*** 注意：玩家使用的是原创角色（OC），以下是角色详细设定 ***
${ocProfile}
*** 设定结束 ***
请务必遵循上述设定来塑造角色的能力、性格和人际关系起点。
` : `
请基于《${ipName}》的原著设定，还原${charName}的性格、能力和人际关系。
`}

**重要：故事必须从以下关键情节点开始：**
**${startNode}**

你的任务是基于《${ipName}》的世界观，生动地描述场景，并为玩家提供能够影响故事走向的选择。

规则：
1. 立即根据上述“关键情节点”进行开场描写。
2. 叙述要生动沉浸，严谨遵守原著设定的物理法则和魔法/科技规则。保持简洁（大约100-200个汉字）。
3. 每一轮必须提供**恰好 3 个**截然不同的预设选择。
4. 玩家也可能输入自定义的行动描述（不在预设选项中），你需要根据玩家的描述合理推进剧情。
5. 如果选择导致悲剧结局（例如：死亡、被永久囚禁、彻底违背角色信念导致的失败），将 status 设为 'GAME_OVER'。
6. 如果选择导致圆满结局（例如：实现了角色的终极目标、战胜了宿敌、获得了完美的归宿），将 status 设为 'VICTORY'。
7. 如果故事继续，将 status 设为 'CONTINUE'。
8. 保持语调与原著风格一致（例如：如果是武侠则用侠义风，科幻则用理性冷峻风）。
9. 当游戏结束（status 不为 CONTINUE）时，**必须**在 characterAnalysis 字段中提供“灵魂映像”：分析玩家的操作是否符合角色性格，并对最终命运进行简短哲学总结（约50-100字）。
10. 严格按照 JSON 格式输出，不要包含任何其他文本。
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: {
      type: Type.STRING,
      description: "The story description for the current scene in Chinese.",
    },
    status: {
      type: Type.STRING,
      enum: ["CONTINUE", "GAME_OVER", "VICTORY"],
      description: "The current state of the game based on the narrative result.",
    },
    characterAnalysis: {
      type: Type.STRING,
      description: "Analysis of the player's character and fate. Required when status is GAME_OVER or VICTORY. Otherwise empty string.",
    },
    choices: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          text: { type: Type.STRING, description: "The text description of the choice in Chinese." },
        },
        required: ["id", "text"],
      },
    },
  },
  required: ["narrative", "status", "choices", "characterAnalysis"],
};

// New Schema for strict IP validation based on new prompt
const ipValidationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isExist: {
      type: Type.BOOLEAN,
      description: "Whether the work exists.",
    },
    author: {
      type: Type.STRING,
      description: "Official author of the work.",
    },
    originalLanguage: {
      type: Type.STRING,
      description: "Standard language name (e.g. English, Chinese).",
    },
    abstract: {
      type: Type.STRING,
      description: "Factual English summary under 200 words from canonical description.",
    },
    category: {
      type: Type.STRING,
      enum: ['Fairy Tale', 'Western Fantasy', 'Eastern Fantasy', 'Modern Urban', 'Mystery & Horror', 'War', 'Western', 'Science Fiction'],
      description: "Category of the work.",
    }
  },
  required: ["isExist"],
};

// Schema for Character validation & extraction
const characterValidationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isExist: { type: Type.BOOLEAN },
    basicInfo: {
      type: Type.OBJECT,
      properties: {
        canonicalName: { type: Type.STRING },
        aliases: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    features: {
      type: Type.OBJECT,
      properties: {
        occupations: { type: Type.ARRAY, items: { type: Type.STRING } },
        affiliations: { type: Type.ARRAY, items: { type: Type.STRING } },
        coreRelationships: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    appearance: { type: Type.STRING }
  },
  required: ["isExist"]
};

const questionsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of 9-11 questions including base, dynamic, and ending questions.",
    },
  },
  required: ["questions"],
};

const visualPromptSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    visualDescription: {
      type: Type.STRING,
      description: "A detailed visual description of the character in English, focusing on appearance, clothing, and style.",
    },
  },
  required: ["visualDescription"],
};

const plotNodesSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of plot node descriptions in English or the original language of the work.",
    },
  },
  required: ["nodes"],
};

export interface IpValidationResult {
  isExist: boolean;
  author?: string;
  originalLanguage?: string;
  abstract?: string;
  category?: string;
}

export interface CharacterValidationResult {
  isExist: boolean;
  basicInfo?: {
    canonicalName: string;
    aliases: string[];
  };
  features?: {
    occupations: string[];
    affiliations: string[];
    coreRelationships: string[];
  };
  appearance?: string;
}

export interface OcQuestionsResult {
  questions: string[];
}

export class GameService {
  private ai: GoogleGenAI;
  private chat: Chat | null = null;
  private currentIp: string = "";
  private ocVisualDescription: string = "";

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  private async retryOperation<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (e) {
        console.warn(`Attempt ${i + 1} failed:`, e);
        if (i === retries - 1) throw e;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
    throw new Error("Operation failed after retries");
  }

  // Set the visual description for the OC to be used in future image generations
  public setOcVisualDescription(desc: string) {
    this.ocVisualDescription = desc;
  }

  public async validateIp(ipName: string): Promise<IpValidationResult> {
    const prompt = `
You are a professional global literary and media works database query API. Execute the following workflow sequentially and strictly.

INPUT
The user provides a work name ("${ipName}").

AUTHORITATIVE DATA SOURCES HIERARCHY
You must use the following hierarchical source priority for verification. Move to the next tier only if the current tier yields no result.
Tier 1 (Global Canonical Sources): Wikipedia, official publisher/studio websites, IMDb, Goodreads, ISFDB (Internet Speculative Fiction Database).
Tier 2 (Language/Region Specific Platforms):

Chinese: Jinjiang Literature City, Changpei Literature, Qidian, Douban (book/film entry).

Japanese: Shousetsuka ni Narou, Kakuyomu, Pixiv, E-hon (出版情報).

English/International: Amazon KDP (official page), Wattpad, Archive of Our Own, Royal Road.
Tier 3 (Other Reputable Databases): National library catalogs, academic publication databases.
CRITICAL: Author and synopsis must be extracted from the highest-tier source available. Forums, social media, and fan wikis are NEVER authoritative sources.

STEP 1: TITLE MATCH & METADATA VERIFICATION
1.1 Search: Perform a search following the source hierarchy above.
1.2 Verification: For any match, you MUST confirm its existence and core metadata (title, author) in at least TWO independent reliable sources from Tier 1 or Tier 2.
1.3 Match Resolution:

If NO verified match is found: Output {"isExist": false} and STOP.

If ONE verified match is found: Record the official author and original language (e.g., "English", "Japanese", "Chinese") from the canonical sources. Set isExist to true.

If MULTIPLE verified works share the same title:
a. Determine the most prominent work based on cross-source consensus, cultural impact, and mainstream recognition.
b. For works of similar prominence, prioritize the one with verifiable information in the highest-tier source.
c. Record its official author and original language.
1.4 Proceed ONLY if isExist is true with verified author and language.

STEP 2: CONTENT VERIFICATION & ABSTRACT GENERATION

Prerequisite: isExist is true.

Source Mandate: The abstract must be based on the canonical description from the highest-tier source used in Step 1 (e.g., Wikipedia plot summary, official publisher's synopsis).

Verification Rule: If a canonical synopsis cannot be located, set isExist to false, output {"isExist": false}, and STOP.

If verified:

Generate a concise abstract in English, under 200 words.

The summary must be factual and neutral, based SOLELY on the canonical source.

Do not add unverified details, opinions, or fan interpretations.

STEP 3: CATEGORIZATION

Prerequisite: isExist is still true.

Based on the verified synopsis and the work's widely recognized genre, classify it into ONE category:

Fairy Tale

Western Fantasy

Eastern Fantasy

Modern Urban

Mystery & Horror

War

Western

Science Fiction

Use the work's core setting, themes, and its classification in authoritative sources as the basis.

OUTPUT FORMAT
Output ONLY valid JSON, with no additional text.

If isExist is true:
{
"isExist": true,
"author": "[Author name as in canonical sources]",
"originalLanguage": "[Standard language name, e.g., English, Chinese]",
"abstract": "[Factual English summary under 200 words from canonical description]",
"category": "[One category from the list]"
}

If isExist is false:
{
"isExist": false
}

FINAL AND STRICT GUARDRAILS

AUTHORITY OVERRIDE: Information from Tier 1 sources (e.g., Wikipedia, official site) always overrides information from lower-tier sources in case of conflict.

CROSS-SOURCE VERIFICATION: Core metadata (especially author) requires confirmation from multiple independent reliable sources when possible. Single-source claims need higher scrutiny.

NO HALLUCINATION: If any verification step fails, the default and only action is to set isExist to false. Never guess or invent.

DETERMINISM: Identical queries must follow the same logic path and source hierarchy, yielding identical results.
    `;

    return this.retryOperation(async () => {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: ipValidationSchema,
        }
      });
      return JSON.parse(response.text!) as IpValidationResult;
    });
  }

  public async validateCharacter(ipName: string, charName: string): Promise<CharacterValidationResult> {
    const prompt = `
ROLE: You are a precise character data extraction API for literary works.
INPUT: The user will provide a query in the format: "WORK_NAME("${ipName}"): CHARACTER_NAME("${charName}")". Example: "Harry Potter: Severus Snape".
TASK: Analyze the original text of the specified WORK_NAME. Determine if the CHARACTER_NAME exists as a defined character. If yes, extract and structure all available information into the specified JSON fields.
PROCESSING LOGIC (You MUST follow these steps in order):
1. EXISTENCE VERIFICATION
Search the original text for explicit mentions and narrative presence of CHARACTER_NAME.
Existence Criteria: The character must be actively involved in the narrative or be part of the established world-building (e.g., named historical figures within the story). Mere passing mentions do not qualify.
If the character does not meet the criteria: Output {"isExist": false} and STOP.
If the character exists: Proceed to Step 2.
2. DATA EXTRACTION & FIELD POPULATION (Execute ONLY if isExist is true)
You must extract information to fill the following schema. Use an empty array [] or empty string "" if no clear information is found for a field.
{
"isExist": true,
"basicInfo": {
"canonicalName": "", // The character's primary, official name in the text.
"aliases": [] // A list of alternative names, titles, or epithets.
},
"features": {
"occupations": [], // All roles, jobs, or titles (e.g., ["Student", "Quidditch Seeker"]).
"affiliations": [], // All groups, factions, families, or organizations the character belongs to.
"coreRelationships": [] // Key personal relationships described in the narrative.
},
"appearance": "" // A direct quote or close paraphrase of the physical description from the text.
}
Extraction Rules for Features:
Be exhaustive: Populate each array with ALL relevant, verifiable items from the text.
Be specific: Prefer concrete terms ("Potions Master") over vague ones ("teacher").
Use narrative context: Relationships should describe the narrative connection.
3. FINAL OUTPUT
Output ONLY the JSON object. No explanatory text.
Ensure the JSON is syntactically correct.
VALIDATION & ERROR HANDLING
No Hallucination: If you cannot find explicit text evidence for a field, leave it empty. Do not invent.
Ambiguous Cases: If a character's existence is ambiguous (e.g., only mentioned once as a legend), default to {"isExist": false}.
Name Variations: If the input name is a common alias, still try to find the canonical name and populate the aliases field accordingly.
`;

    return this.retryOperation(async () => {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: characterValidationSchema,
        }
      });
      return JSON.parse(response.text!) as CharacterValidationResult;
    });
  }

  public async generateOcQuestions(ipName: string, charName: string, concept: string): Promise<string[]> {
    return this.retryOperation(async () => {
      const prompt = `
You are a professional Original Character (OC) questionnaire generator. Your task is to generate a list of questions for collecting OC information based on a user-specified fictional world or setting.

CORE GENERATION RULES
You MUST strictly follow this structure when generating the questionnaire list:

Fixed Base Questions: The list MUST always begin with these four base questions: ["Name", "Age", "Gender", "Physical Description/Appearance"].

Dynamic Core Questions: Based on an analysis of the given fictional setting ("${ipName}"), you MUST deduce and add 3 to 5 unique questions that best capture the setting's core identity, abilities, or social structure (e.g., Hogwarts House, Cybernetic Implants, Martial Arts Sect).

Fixed Ending Questions: The list MUST always end with these two standard questions: ["Relationship to Canon Characters", "Additional Notes"].

List Format & Length: The final output MUST be a JSON object with a "questions" field containing the list of strings. The total length must be between 8 and 10 items.

Question Phrasing: Questions should be concise English nouns or short phrases, clearly indicating what information the user should provide.

PROCESSING WORKFLOW

Receive Input: The user will provide the name of a work or fictional setting.

Analyze the Setting: Quickly identify the most central and distinguishing dimensions that define a character's identity in that world.

Generate the List: Strictly combine the components according to the CORE GENERATION RULES above.

Output: Output ONLY the valid JSON object.

EXAMPLES

Input: "Harry Potter"
Output: { "questions": ["Name", "Age", "Gender", "Physical Description/Appearance", "Occupation/Identity", "Hogwarts House", "Wand Core & Wood", "Relationship to Canon Characters", "Additional Notes"] }

Input: "Cyberpunk 2077"
Output: { "questions": ["Name", "Age", "Gender", "Physical Description/Appearance", "Faction/Street Cred", "Career/Skill Speciality", "Cybernetic Implant Tendency", "Relationship to Canon Characters", "Additional Notes"] }

CRITICAL CONSTRAINTS
You are FORBIDDEN from outputting any content that is not the JSON.
You are FORBIDDEN from adding, removing, or altering the fixed base and ending questions.
The dynamic core questions must be specific to the setting's lore.

Now, execute strictly based on the rules above.

Input: "${ipName}"
`;
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: questionsSchema,
        }
      });
      const result = JSON.parse(response.text!) as OcQuestionsResult;
      return result.questions;
    });
  }

  public async generateOcVisualPrompt(profile: string): Promise<string> {
    return this.retryOperation(async () => {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Based on the following character profile for an RPG, generate a concise but detailed visual description for an image generator (like Midjourney or Stable Diffusion). 
        Profile: ${profile}
        
        Focus on physical appearance, clothing, key accessories, and general vibe. Avoid text about personality unless it affects appearance. output in English.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: visualPromptSchema,
        }
      });
      const result = JSON.parse(response.text!);
      return result.visualDescription;
    });
  }

  public async generatePlotNodes(ipName: string, charName: string, charMode: 'CANON' | 'OC', ocProfile?: string): Promise<string[]> {
    return this.retryOperation(async () => {
      let prompt = "";
      
      if (charMode === 'CANON') {
        prompt = `
ROLE: You are an analyst identifying key decision points in a character's arc.

INPUT: Query format: WORK_NAME: "${ipName}", CHARACTER_NAME: "${charName}"

TASK: Identify 3 to 5 moments in the original story where the CHARACTER_NAME makes a clear, active decision or choice that significantly alters their own path, relationships, or the plot's direction. Focus on choices that define the character.

FRAMEWORK FOR IDENTIFYING A KEY DECISION NODE:
A valid node must describe a moment where:
The character is faced with a defined option or dilemma.
The character takes a conscious action or makes a clear choice (to do or not do something).
This choice has clear, tangible consequences for what happens next in their story.

PROCESSING INSTRUCTIONS:
SCAN FOR CROSSROADS: Review the character's story, looking for explicit moments of choice (e.g., to accept a quest, to betray an ally, to confess a truth, to spare a life).
SELECT & PHRASE: For each chosen moment, phrase it concisely to highlight the decision itself.
ENSURE CHRONOLOGY: List the decision points in the order they occur in the story.

OUTPUT FORMAT:
Output ONLY a JSON object containing a list of strings.
Example: { "nodes": ["Decision to...", "Choice to...", "Vow to..."] }

CRITICAL CONSTRAINT:
DECISION-CENTRIC: Your output must focus on the character's act of choosing. If a moment is just something that happens to the character (e.g., "gets captured"), it is not valid unless it immediately leads to a clear choice they make in response.
        `;
      } else {
        // OC Mode
        prompt = `
ROLE: You are a plot integration specialist in the original author's studio.

INPUT:
WORK: "${ipName}"
OC_PROFILE: ${ocProfile || "No specific profile provided, assume generic archetype."}

TASK: Using the OC_PROFILE as the SOLE basis for your reasoning, analyze the original work's timeline and propose 2 to 4 precise plot nodes where this specific OC could most logically and meaningfully be introduced or become involved.

NODE SELECTION CRITERIA:
- Logical Fit: A node must directly relate to the OC's defined attributes. For example, an OC with "affiliations": ["Jedi Order"] fits nodes involving Jedi, not unrelated bounty hunter plots.
- Narrative Integration Point: Choose nodes where the OC could naturally enter the scene, interact with canon characters, or use their skills.
- Temporal Specificity: Each node must be described with a concrete event, location, or chapter title that acts as a unique anchor in the story's chronology (e.g., "During the Battle of Helm's Deep", "At the Yule Ball dance").
- Conciseness: Describe each node in 10 words or fewer.
- Chronological Start: The story's canonical beginning event MUST be listed as the first node if the OC's profile justifies a presence from the start (e.g., a student character at a school story).

PROCESSING FRAMEWORK (Follow this internally):
1. Profile Scan: Extract key integration hooks from the OC_PROFILE.
2. Timeline Match: Mentally scan the work's timeline for events where these hooks would be relevant.
3. Node Evaluation: Select only nodes where the OC's presence would feel logical and additive to the existing scene.
4. List Finalization: Ensure the list is chronological, starts correctly, contains 2-4 nodes, and descriptions are concise.

OUTPUT FORMAT:
Output ONLY a JSON object containing a list of strings.
Example: { "nodes": ["Plot Node Description 1", "Plot Node Description 2"] }

CRITICAL CONSTRAINTS:
- No Invention: Only propose nodes from the original work's plot. Do not create new events.
- Profile-Locked Reasoning: Your suggestions must be directly justified by the OC_PROFILE fields. Ignore any assumptions not grounded in it.
`;
      }

      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: plotNodesSchema,
        }
      });
      const result = JSON.parse(response.text!);
      return result.nodes;
    });
  }

  public async startGame(ipName: string, charName: string, startNode: string, ocProfile?: string): Promise<StoryNode> {
    this.currentIp = ipName;
    return this.retryOperation(async () => {
      const chatSession = this.ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: generateSystemInstruction(ipName, charName, startNode, ocProfile),
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });
      
      this.chat = chatSession;

      const result = await chatSession.sendMessage({
        message: `开始故事。背景是《${ipName}》，我是${charName}。我们从这个节点开始：${startNode}。请描述开场。`,
      });

      return JSON.parse(result.text!) as StoryNode;
    });
  }

  public async makeChoice(choiceText: string): Promise<StoryNode> {
    if (!this.chat) throw new Error("Game session not initialized.");
    const chatSession = this.chat;
    return this.retryOperation(async () => {
      const result = await chatSession.sendMessage({ message: `玩家采取行动: ${choiceText}` });
      return JSON.parse(result.text!) as StoryNode;
    });
  }

  public async generateImage(narrative: string, isOcPortrait: boolean = false, ocVisualDescription?: string): Promise<string | null> {
    try {
      const context = this.currentIp ? `Style consistent with the world of ${this.currentIp}.` : "Fantasy style.";
      
      // If we have an OC description, include it in the prompt
      let characterContext = "";
      const visualDesc = ocVisualDescription || this.ocVisualDescription;
      if (visualDesc) {
        characterContext = `The MAIN CHARACTER in the image MUST look like this: ${visualDesc}.`;
      }

      let prompt = "";
      if (isOcPortrait) {
        // Specific prompt for OC generation
         prompt = `Character Portrait, high quality, masterpiece. ${context} ${characterContext} ${narrative}`;
      } else {
        // Scene generation
         const shortNarrative = narrative.length > 500 ? narrative.substring(0, 500) : narrative;
         prompt = `Realistic hand-drawn illustration style, detailed background, cinematic lighting, masterpiece. ${context} ${characterContext} Scene action: ${shortNarrative}`;
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
      });
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
      return null;
    } catch (error: any) {
      if (error.status === 'RESOURCE_EXHAUSTED' || error.code === 429) {
          console.warn("Image generation quota exceeded. Skipping image.");
          return null; // Silently fail so the story continues
      }
      console.error("Failed to generate image:", error);
      return null;
    }
  }
}

// 导出单例实例
let gameServiceInstance: GameService | null = null;

export const getGameService = (): GameService => {
  if (!gameServiceInstance) {
    gameServiceInstance = new GameService();
  }
  return gameServiceInstance;
};
