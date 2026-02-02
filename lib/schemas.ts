import { Type } from "@google/genai";

export const responseSchema: any = {
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

export const ipValidationSchema: any = {
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
      description: "Standard language name (e.g., English, Chinese).",
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

export const characterValidationSchema: any = {
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

export const questionsSchema: any = {
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

export const visualPromptSchema: any = {
  type: Type.OBJECT,
  properties: {
    visualDescription: {
      type: Type.STRING,
      description: "A detailed visual description of the character in English, focusing on appearance, clothing, and style.",
    },
  },
  required: ["visualDescription"],
};

export const plotNodesSchema: any = {
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

export const openingSceneSchema: any = {
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
