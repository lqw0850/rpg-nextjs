import type { Chat } from "@google/genai";

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
  lastActivity?: number;
}

interface OpeningSceneResult {
  scene: string;
  options: {
    A: string;
    B: string;
    C: string;
  };
}
