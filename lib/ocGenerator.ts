import { GoogleGenAI } from "@google/genai";
import { questionsSchema, visualPromptSchema, plotNodesSchema } from "./schemas";
import type { OcQuestionsResult } from "./types";

export class OcGenerator {
  private ai: GoogleGenAI;

  constructor(ai: GoogleGenAI) {
    this.ai = ai;
  }

  public async generateOcQuestions(ipName: string, charName: string, concept: string): Promise<string[]> {
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
  }

  public async generateOcVisualPrompt(profile: string): Promise<string> {
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
  }

  public async generatePlotNodes(ipName: string, charName: string, charMode: 'CANON' | 'OC', ocProfile?: string): Promise<string[]> {
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
  }
}
