import { GoogleGenAI } from "@google/genai";
import type { StoryNode } from "../types";
import { Validators } from "./validators";
import { GameEngine } from "./gameEngine";
import { ImageGenerator } from "./imageGenerator";
import { OcGenerator } from "./ocGenerator";
import { getGlobalSessions, createSession, getSession, updateSessionActivity, deleteSession, cleanupExpiredSessions } from "./sessionManager";
import type { GameSession } from "./types";

export class GameService {
  private validators: Validators;
  private gameEngine: GameEngine;
  private imageGenerator: ImageGenerator;
  private ocGenerator: OcGenerator;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    this.validators = new Validators(ai);
    this.gameEngine = new GameEngine(ai);
    this.imageGenerator = new ImageGenerator(ai);
    this.ocGenerator = new OcGenerator(ai);
    
    // 启动定期清理任务
    this.startCleanupInterval();
  }

  private startCleanupInterval() {
    // 每5分钟清理一次过期会话
    this.cleanupInterval = setInterval(() => {
      cleanupExpiredSessions();
    }, 5 * 60 * 1000);
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

  public setOcVisualDescription(sessionId: string, desc: string) {
    const session = getSession(sessionId);
    if (session) {
      session.ocVisualDescription = desc;
    }
  }

  public async validateIp(ipName: string) {
    return this.retryOperation(async () => {
      return await this.validators.validateIp(ipName);
    });
  }

  public async validateCharacter(ipName: string, charName: string) {
    return this.retryOperation(async () => {
      return await this.validators.validateCharacter(ipName, charName);
    });
  }

  public async generateOcQuestions(ipName: string, charName: string, concept: string): Promise<string[]> {
    return this.retryOperation(async () => {
      return await this.ocGenerator.generateOcQuestions(ipName, charName, concept);
    });
  }

  public async generateOcVisualPrompt(profile: string): Promise<string> {
    return this.retryOperation(async () => {
      return await this.ocGenerator.generateOcVisualPrompt(profile);
    });
  }

  public async generatePlotNodes(ipName: string, charName: string, charMode: 'CANON' | 'OC', ocProfile?: string): Promise<string[]> {
    return this.retryOperation(async () => {
      return await this.ocGenerator.generatePlotNodes(ipName, charName, charMode, ocProfile);
    });
  }

  public async startGame(ipName: string, charName: string, startNode: string, ocProfile?: string): Promise<{ sessionId: string; storyNode: StoryNode }> {
    return this.retryOperation(async () => {
      return await this.gameEngine.startGame(ipName, charName, startNode, (sessionId, chat) => {
        createSession(sessionId, chat, ipName);
      }, ocProfile);
    });
  }

  public async makeChoice(sessionId: string, choiceText: string): Promise<StoryNode> {
    return this.retryOperation(async () => {
      const session = getSession(sessionId);
      if (!session) throw new Error("Game session not found.");
      
      updateSessionActivity(sessionId);
      return await this.gameEngine.makeChoice(session, choiceText);
    });
  }

  public async generateImage(sessionId: string, narrative: string, isOcPortrait: boolean = false, ocVisualDescription?: string): Promise<string | null> {
    try {
      const session = getSession(sessionId);
      if (!session) throw new Error("Game session not found.");
      
      updateSessionActivity(sessionId);
      return await this.imageGenerator.generateImage(session, narrative, isOcPortrait, ocVisualDescription);
    } catch (error: any) {
      if (error.status === 'RESOURCE_EXHAUSTED' || error.code === 429) {
          console.warn("Image generation quota exceeded. Skipping image.");
          return null;
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
