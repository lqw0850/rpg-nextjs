import { GoogleGenAI, Type } from "@google/genai";
import type { Chat, Schema } from "@google/genai";
import type { StoryNode } from "../types";

const generateSystemInstruction = (ipName: string, charName: string, startNode: string, ocProfile?: string) => `
You are the Game Master for an open-ended interactive text adventure.
The setting for this game is the world of: **${ipName}**.
The player is controlling the character: **${charName}**.

${ocProfile ? `
*** IMPORTANT: The player is using an Original Character (OC). Here is the detailed profile ***
${ocProfile}
*** End of Profile ***
You MUST strictly adhere to this profile when defining the character's abilities, personality, and starting relationships.
` : `
*** IMPORTANT: The player is controlling a canon character ***
You MUST faithfully portray ${charName}'s personality, abilities, relationships, and motivations as established in the original work "${ipName}" at this point in the story.
`}

CRITICAL STARTING POINT: The story must begin at the following key plot node:
**${startNode}**

Your task is to narrate the story based on the "${ipName}" universe, providing vivid descriptions and offering choices that meaningfully influence the plot.

CORE RULES:

IMMERSIVE NARRATION: Begin the story immediately from the "key plot node". Every response must advance the plot based on the entire conversation history. Narration must be vivid, immersive, and concise (approximately 100-200 Chinese characters in length, or equivalent descriptive density in English).

WORLD CONSISTENCY LOCK: You are forbidden from introducing power systems, organizations, characters, or items that do not exist in the canon. All physical, magical, or technological rules must align perfectly with the original work.

CHARACTER CONSISTENCY LOCK:

If playing an OC, all words and actions must be constrained within the capabilities and knowledge defined in their profile.

If playing a canon character, all internal monologue, dialogue, and decisions must align with the character's established personality and motives at this story point. The player may "control" their choices, but the world's reaction must follow from the character's pre-existing relationships and personality logic.

NARRATIVE PACING & STRUCTURE: This is a focused story intended to conclude in roughly 20 turns. You are responsible for managing the pacing to create a satisfying narrative arc. Use the following as a guide:

Turns 1-7 (Setup & Rising Tension): Introduce the core conflict and key characters. Establish relationships, gather resources, and face initial challenges that prepare for the main crisis.

Turns 8-15 (Confrontation & Crisis): The central conflict intensifies. Escalate stakes, force difficult choices, and move the story toward its climax. Options should have higher consequences.

Turns 16-20 (Climax & Resolution): Drive the story toward its decisive moment. Options should push toward a final resolution. Be prepared to guide the narrative to a conclusive ending (VICTORY or GAME_OVER) within this window.

OPTION DESIGN: Each turn, you must provide EXACTLY 3 distinct choice options. They should represent:

Option A: An active, direct, or aggressive strategy.

Option B: A cautious, observant, or indirect strategy.

Option C: A unique or creative strategy that best utilizes the current character's defining traits (OC features or the canon character's core abilities).

HANDLING CUSTOM ACTIONS: If the player inputs a custom action not listed in the options, you must judge its feasibility based on the world's logic and the character's abilities:

If PLAUSIBLE: Integrate it seamlessly and advance the plot.

If PARTIALLY PLAUSIBLE: Advance the plausible aspects, ignoring or correcting the impossible parts.

If IMPOSSIBLE (e.g., casting a spell in a non-magical world): Describe why the action fails and its consequences in the narration, then provide 3 new plausible options.

ENDING CONDITIONS: Determine the status for each turn:

CONTINUE: The story proceeds normally.

GAME_OVER: Triggered by an irreversible, story-ending negative outcome (e.g., character death, permanent imprisonment with no escape, the core goal being destroyed).

VICTORY: Triggered by achieving a clear, definitive positive endpoint (e.g., accomplishing the player's stated core goal, defeating the archenemy and resolving the central conflict, reaching a universally recognized fulfilling conclusion).

Judgments MUST be based on plot logic, not subjective feeling.

Pacing Note: Be especially mindful of these conditions during Turns 16-20, actively steering the narrative toward a fitting conclusion.

NARRATIVE TONE LOCK: The prose style, vocabulary, and tone of your narration MUST closely match the writing style of the original work "${ipName}" (e.g., wuxia style for martial arts tales, gritty and rational for cyberpunk).

GAME CONCLUSION: When the status is not CONTINUE, you MUST provide a "Soul Reflection" in the characterAnalysis field. This should analyze how the player's overall actions throughout the game aligned with the character's established nature, followed by a brief philosophical summary of the final fate (approx. 50-100 words).

OUTPUT FORMAT:
You must output ONLY the following JSON object. No other text is permitted.
{
  "narration": "The narrative text for the current turn.",
  "options": {
    "A": "Option A text",
    "B": "Option B text",
    "C": "Option C text"
  },
  "status": "CONTINUE",
  "characterAnalysis": ""
}
CRITICAL NOTE: Populate the characterAnalysis field ONLY when the status is GAME_OVER or VICTORY. Otherwise, it must be an empty string "".
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narration: {
      type: Type.STRING,
      description: "The narrative text for the current turn.",
    },
    status: {
      type: Type.STRING,
      enum: ["CONTINUE", "GAME_OVER", "VICTORY"],
      description: "The current state of the game.",
    },
    characterAnalysis: {
      type: Type.STRING,
      description: "Soul Reflection. Required when status is GAME_OVER or VICTORY. Otherwise empty string.",
    },
    options: {
      type: Type.OBJECT,
      properties: {
        A: { type: Type.STRING },
        B: { type: Type.STRING },
        C: { type: Type.STRING },
      },
      required: ["A", "B", "C"],
    },
  },
  required: ["narration", "status", "options", "characterAnalysis"],
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

const openingSceneSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    scene: { type: Type.STRING, description: "The scene description in English." },
    options: {
      type: Type.OBJECT,
      properties: {
        A: { type: Type.STRING, description: "Option A text in English." },
        B: { type: Type.STRING, description: "Option B text in English." },
        C: { type: Type.STRING, description: "Option C text in English." },
      },
      required: ["A", "B", "C"]
    }
  },
  required: ["scene", "options"]
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

export interface GameSession {
  id: string;
  chat: Chat;
  ipName: string;
  ocVisualDescription: string;
}

interface OpeningSceneResult {
  scene: string;
  options: {
    A: string;
    B: string;
    C: string;
  };
}

export class GameService {
  private ai: GoogleGenAI;
  private sessions: Map<string, GameSession>;

  constructor(sessionStore?: Map<string, GameSession>) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.sessions = sessionStore || new Map();
  }

  private async retryOperation<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (e: any) {
        console.warn(`Attempt ${i + 1} failed:`, e);
        
        // Check for 429/Resource Exhausted
        const isRateLimit = e.status === 'RESOURCE_EXHAUSTED' || e.code === 429 || (e.message && e.message.includes('429'));

        if (i === retries - 1) throw e;
        
        // If it's a rate limit error, wait significantly longer (e.g., 4s, 8s...) to allow quota refill
        const delay = isRateLimit ? 4000 * (i + 1) : 1000 * Math.pow(2, i);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error("Operation failed after retries");
  }

  // Set the visual description for the OC to be used in future image generations
  public setOcVisualDescription(sessionId: string, desc: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.ocVisualDescription = desc;
    }
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
You must strictly follow the provided JSON schema.
If the work is verified (isExist=true), populate all fields (author, originalLanguage, abstract, category) based on authoritative sources.
If not verified, set isExist=false.

Do not include any markdown formatting.
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

  private async generateOpeningNode(ipName: string, charName: string, startNode: string, ocProfile?: string): Promise<OpeningSceneResult> {
  const isOc = !!ocProfile;
  let prompt = "";

  if (!isOc) {
    // Canon Prompt
    prompt = `
You are a "Canon Character Fate Re-enactor". When a user specifies a canon character and their key decision node, your task is to simulate the "critical moment" at that node and present three different choices the character could make based on their personality and situation.

INPUT DATA
The user provides input in the format: Character Name: Key Node Description
Data: ${charName}: ${startNode}

CORE RULES
1. Scene Restoration: Accurately depict the specific environment, the character's immediate psychology, known information, and the pressures they face at the precise moment before the canonical decision occurs.
2. Option Generation Logic: You must provide three options representing three different courses of action:
   - Option A. The Canon Path: The choice the character actually made in the original work.
   - Option B. The Character Path: An alternative course of action that differs in specifics but remains consistent with the character's core personality traits (e.g., caution, pride, loyalty).
   - Option C. The Reversal Path: A radical choice that seems like a deviation on the surface but could still originate from a deep-seated core obsession or motive of the character.
3. Option Description: Each option should describe only the specific, actionable step the character is about to take at that instant. Do not add analysis of motivation or risk.
4. LANGUAGE: The output "scene" and "options" text MUST be in ENGLISH.

OUTPUT FORMAT
Output ONLY the following JSON object. No other text.
{
  "scene": "Approximately 200-word description of the 'critical moment' scene.",
  "options": {
    "A": "Description of the Canon Path choice.",
    "B": "Description of the Character Path choice.",
    "C": "Description of the Reversal Path choice."
  }
}

ABSOLUTE CONSTRAINTS
- Character-Driven: All options must be strictly derived from the character's known personality, capabilities, and motives at that point in time. Do not introduce information or awareness they could not possibly have.
- Action-Focused: Options must describe only the concrete, actionable step the character is about to take. No explanatory text.
- No Omniscience: Do not generate options based on knowledge of future events that the character cannot know.
      `;
    } else {
      // OC Prompt
      prompt = `
You are a "Fate Intervention" narrative engine. Your sole purpose is to place the user's Original Character (OC) at the scene moments before a canonical character makes a tragic key decision, and to provide options to attempt to alter that fate.

INPUT DATA FORMAT
- target_node: ${startNode}
- OC_profile: ${ocProfile}

CORE EXECUTION RULES
You must follow these steps strictly:

1.  DEDUCE THE INTERVENTION LOGIC
    Based solely on the OC_profile, you must deduce the ONE plausible reason for the OC's presence. Follow this hierarchy:
    - If the OC's Core Relationship is directly to the target character, the reason is a direct encounter based on that relationship.
    - If the OC's Identity or Affiliation is logically linked to the event, the reason is arriving while performing relevant duties.
    - If neither applies, the reason is a strange twist of fate or temporal anomaly.

2.  CONSTRUCT THE "FINAL SECOND" SCENE
    Generate a 200-300 word, tense scene. It MUST include:
    - Canonical Freeze-Frame: An exact description of the target character's state and action immediately before the decision is finalized.
    - OC's Entry: The OC's arrival, executed according to the logic from Step 1.
    - Immediate Crisis: A clear statement that the decision is literally about to happen in the next second.

3.  DESIGN THE "INTERVENTION OPTIONS"
    Provide three options starting with "You decide to...". Each must leverage a DIFFERENT part of the OC_profile:
    - Option A: An action primarily driven by the OC's Identity or Affiliation.
    - Option B: An action primarily based on the OC's Core Relationship to the target character.
    - Option C: An action primarily using the OC's unique Special Ability/Item.
    - Each option MUST be followed by a clear, short-term risk in parentheses.
    
4. LANGUAGE: The output "scene" and "options" text MUST be in ENGLISH.

OUTPUT FORMAT
Output ONLY the following JSON object, with no other text.
{
  "scene": "The 200-300 word 'final second' scene text here.",
  "options": {
    "A": "You decide to...",
    "B": "You decide to...",
    "C": "You decide to..."
  }
}

ABSOLUTE CONSTRAINTS
- Temporal Lock: The scene must end the literal moment before the canonical decision is physically or verbally completed.
- Logic Lock: The OC's arrival must be a strict, reasoned deduction from the OC_profile.
- Option Clarity: Each option must be a clear, actionable statement beginning with "You decide to...".
      `;
    }

    return this.retryOperation(async () => {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: openingSceneSchema,
        }
      });
      if (!response.text || response.text === "undefined") {
        throw new Error("Invalid API response");
      }
      return JSON.parse(response.text);
    });
  }

  public async startGame(ipName: string, charName: string, startNode: string, ocProfile?: string): Promise<{ sessionId: string; storyNode: StoryNode }> {
    return this.retryOperation(async () => {
      // 1. Generate the initial scene and choices using specific prompt
      const opening = await this.generateOpeningNode(ipName, charName, startNode, ocProfile);

      // 2. Construct the StoryNode (Legacy format for App)
      const initialStoryNode: StoryNode = {
        narrative: opening.scene,
        choices: [
          { id: 'A', text: opening.options.A },
          { id: 'B', text: opening.options.B },
          { id: 'C', text: opening.options.C },
        ],
        status: 'CONTINUE',
        characterAnalysis: ''
      };

      // Construct the initial response in the NEW format for the history
      const initialModelTurn = {
        narration: opening.scene,
        options: opening.options, // { A:..., B:..., C:... }
        status: 'CONTINUE',
        characterAnalysis: ''
      };

      // 3. Generate session ID
      const sessionId = crypto.randomUUID();

      // 4. Initialize the Main Chat Session with primed history using new format
      const chat = this.ai.chats.create({
        model: "gemini-3-flash-preview",
        history: [
          {
            role: 'user',
            parts: [{ text: `开始故事。背景是《${ipName}》，我是${charName}。我们从这个节点开始：${startNode}。` }]
          },
          {
            role: 'model',
            parts: [{ text: JSON.stringify(initialModelTurn) }]
          }
        ],
        config: {
          systemInstruction: generateSystemInstruction(ipName, charName, startNode, ocProfile),
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });
      
      // 5. Store session
      this.sessions.set(sessionId, {
        id: sessionId,
        chat,
        ipName,
        ocVisualDescription: ''
      });

      return { sessionId, storyNode: initialStoryNode };
    });
  }

  public async makeChoice(sessionId: string, choiceText: string): Promise<StoryNode> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Game session not found.");
    const chatSession = session.chat;
    return this.retryOperation(async () => {
      const result = await chatSession.sendMessage({ message: `玩家采取行动: ${choiceText}` });
      const rawResponse = JSON.parse(result.text!);
      
      // Map new response format to StoryNode format for frontend
      const storyNode: StoryNode = {
        narrative: rawResponse.narration,
        choices: [
          { id: 'A', text: rawResponse.options.A },
          { id: 'B', text: rawResponse.options.B },
          { id: 'C', text: rawResponse.options.C },
        ],
        status: rawResponse.status,
        characterAnalysis: rawResponse.characterAnalysis
      };
      
      return storyNode;
    });
  }

  public async generateImage(sessionId: string, narrative: string, isOcPortrait: boolean = false, ocVisualDescription?: string): Promise<string | null> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) throw new Error("Game session not found.");
      
      const context = session.ipName ? `Style consistent with the world of ${session.ipName}.` : "Fantasy style.";
      
      // If we have an OC description, include it in the prompt
      let characterContext = "";
      const visualDesc = ocVisualDescription || session.ocVisualDescription;
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

// 使用 Node.js 的 global 对象存储全局会话，防止热重载时丢失会话
declare global {
  var __gameSessions: Map<string, GameSession>;
  var __gameServiceInstance: GameService | null;
}

// 初始化全局会话存储
if (!global.__gameSessions) {
  global.__gameSessions = new Map<string, GameSession>();
}

// 导出单例实例
export const getGameService = (): GameService => {
  if (!global.__gameServiceInstance) {
    global.__gameServiceInstance = new GameService(global.__gameSessions);
  }
  return global.__gameServiceInstance;
};
