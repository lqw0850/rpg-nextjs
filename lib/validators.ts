import { GoogleGenAI } from "@google/genai";
import { ipValidationSchema, characterValidationSchema } from "./schemas";
import type { IpValidationResult, CharacterValidationResult } from "./types";
import { databaseService } from "./databaseService";

export class Validators {
  private ai: GoogleGenAI;

  constructor(ai: GoogleGenAI) {
    this.ai = ai;
  }

  public async validateIp(ipName: string): Promise<IpValidationResult> {
    // 先查询数据库
    const existingIpInfo = await databaseService.findIpInfo(ipName);
    if (existingIpInfo) {
      return {
        isExist: true,
        author: existingIpInfo.author,
        originalLanguage: existingIpInfo.language,
        abstract: existingIpInfo.description,
        category: existingIpInfo.type
      };
    }

    // 数据库中不存在，调用AI验证
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

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: ipName,
      config: {
        responseMimeType: "application/json",
        responseSchema: ipValidationSchema,
        systemInstruction: prompt,
        temperature: 0.5,
      }
    });

    const result = JSON.parse(response.text!) as IpValidationResult;

    // 如果AI判断存在，将结果存入数据库
    if (result.isExist) {
      await databaseService.saveIpInfo(ipName, result);
    }

    return result;
  }

  public async validateCharacter(ipName: string, charName: string): Promise<CharacterValidationResult> {
    const prompt = `
ROLE: You are a precise character data extraction API for literary works.
INPUT: The user will provide a query in the format: "WORK_NAME("${ipName}"): CHARACTER_NAME("${charName}")". Example: "Harry Potter: Severus Snape".
TASK: Analyze the original text of the specified WORK_NAME. Determine if the CHARACTER_NAME exists as a defined character. If yes, extract and structure all available information into the specified JSON fields.
PROCESSING LOGIC (You MUST follow these steps in order):
1. EXISTENCE VERIFICATION
Search the original text for explicit mentions and narrative presence of CHARACTER_NAME.
Existence Criteria: The character must be actively involved in the narrative or be part of the established world-building (e.g., named historical figures within the story).
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
"appearance": "" // A comprehensive description compiled from all physical details (hair, eyes, build, clothing) mentioned throughout the text. Do not limit to a single quote.
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

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `WORK_NAME("${ipName}"): CHARACTER_NAME("${charName}")`,
      config: {
        responseMimeType: "application/json",
        responseSchema: characterValidationSchema,
        systemInstruction: prompt,
        temperature: 0.5,
      }
    });
    console.log(response);
    console.log(response.text);
    return JSON.parse(response.text!) as CharacterValidationResult;
  }
}
