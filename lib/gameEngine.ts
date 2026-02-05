import { GoogleGenAI } from "@google/genai";
import { generateSystemInstruction, generateContinueGameInstruction } from "./prompts";
import { responseSchema, openingSceneSchema } from "./schemas";
import { createSession } from "./sessionManager";
import type { GameSession } from "./types";
import type { StoryNode } from "../types";
import type { Chat } from "@google/genai";

export class GameEngine {
  private ai: GoogleGenAI;

  constructor(ai: GoogleGenAI) {
    this.ai = ai;
  }

  public async generateOpeningNode(ipName: string, charName: string, startNode: string, ocProfile?: string): Promise<{ scene: string; options: { A: string; B: string; C: string } }> {
    let prompt = "";
    
    if (!ocProfile) {
      // Canon Character Prompt
      prompt = `
You are a narrative engine specialized in generating the "critical moment" scene for a canon character at a specific plot node.

INPUT DATA FORMAT
- target_node: ${startNode}
- ip_name: ${ipName}
- character_name: ${charName}

CORE EXECUTION RULES
You must follow these steps strictly:

1.  SCENE CONSTRUCTION
Generate a 200-300 word, tense "final second" scene. It MUST include:
- Canonical Freeze-Frame: An exact description of the character's state and action immediately before the decision is finalized.
- Immediate Crisis: A clear statement that the decision is literally about to happen in the next second.

2.  OPTION DESIGN
Provide three options starting with "You decide to...". Each must represent a distinct strategy:
- Option A: An active, direct, or aggressive strategy.
- Option B: A cautious, observant, or indirect strategy.
- Option C: A unique or creative strategy that best utilizes the character's core abilities.

3.  LANGUAGE: The output "scene" and "options" text MUST be in ENGLISH.

OUTPUT FORMAT
Output ONLY the following JSON object. No other text is permitted.
{
  "scene": "The 200-300 word 'final second' scene text here.",
  "options": {
    "A": "You decide to...",
    "B": "You decide to...",
    "C": "You decide to..."
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

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: openingSceneSchema,
      }
    });

    console.log(response)
    console.log(response.candidates?.[0]?.content?.parts?.[0]?.text)
    // 兼容性获取文本内容
    const responseText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('AI 返回了空响应');
    }

    return JSON.parse(responseText) as { scene: string; options: { A: string; B: string; C: string } };
  }

  public async startGame(
    ipName: string,
    charName: string,
    startNode: string,
    createSession: (id: string, chat: Chat) => void,
    ocProfile?: string
  ): Promise<{ sessionId: string; storyNode: StoryNode }> {
    // 1. Generate the initial scene and choices
    const opening = await this.generateOpeningNode(ipName, charName, startNode, ocProfile);

    // 2. Construct the StoryNode
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

    // 3. Generate session ID
    const sessionId = crypto.randomUUID();

    // 4. Initialize the Main Chat Session with primed history
    const chat = this.ai.chats.create({
      model: "gemini-3-flash-preview",
      history: [
        {
          role: 'user',
          parts: [{ text: `开始故事。背景是《${ipName}》，我是${charName}。我们从这个节点开始：${startNode}。` }]
        },
        {
          role: 'model',
          parts: [{ text: JSON.stringify({
            narration: opening.scene,
            options: opening.options,
            status: 'CONTINUE',
            characterAnalysis: ''
          }) }]
        }
      ],
      config: {
        systemInstruction: generateSystemInstruction(ipName, charName, startNode, ocProfile),
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });
    
    // 5. Create session
    createSession(sessionId, chat);

    return { sessionId, storyNode: initialStoryNode };
  }

  public async makeChoice(session: GameSession, choiceText: string): Promise<StoryNode> {
    const chatSession = session.chat;
    const result = await chatSession.sendMessage({ message: `玩家采取行动: ${choiceText}` });
    const rawResponse = JSON.parse(result.text!);
    
    // Map response format to StoryNode format
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
  }

  public async continueGame(ipName: string, charName: string, latestRound: any, historyRounds: any[], isOc?: boolean, ocProfile?: any): Promise<{ sessionId: string; storyNode: StoryNode }> {
    // 1. Generate session ID
    const sessionId = crypto.randomUUID();

    // 2. Build history from previous rounds
    const history = [];
    
    // Add history rounds as context
    for (const round of historyRounds) {
      history.push({
        role: 'model',
        parts: [{ text: JSON.stringify({
          narration: round.plot,
          options: round.options,
          status: 'CONTINUE',
          characterAnalysis: ''
        }) }]
      });
      history.push({
        role: 'user',
        parts: [{ text: `玩家采取行动: ${round.user_choice}` }]
      });
    }

    // 3. Add the latest round as the current state (without user choice)
    history.push({
      role: 'user',
      parts: [{ text: `继续游戏。背景是《${ipName}》，我是${charName}。我们从这个节点继续：${latestRound.plot}` }]
    });
    history.push({
      role: 'model',
      parts: [{ text: JSON.stringify({
        narration: latestRound.plot,
        options: latestRound.options,
        status: 'CONTINUE',
        characterAnalysis: ''
      }) }]
    });

    // 4. Initialize the Main Chat Session with history
    const chat = this.ai.chats.create({
      model: "gemini-3-flash-preview",
      history: history,
      config: {
        systemInstruction: generateContinueGameInstruction(ipName, charName, historyRounds, isOc, ocProfile),
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    // 5. Create initial story node from latest round
    const initialStoryNode: StoryNode = {
      narrative: latestRound.plot,
      choices: latestRound.options.map((opt: any, index: number) => ({
        id: String.fromCharCode(65 + index), // A, B, C
        text: opt
      })),
      status: 'CONTINUE',
      characterAnalysis: ''
    };

    // 6. Create session
    createSession(sessionId, chat, ipName);

    return { sessionId, storyNode: initialStoryNode };
  }
}
