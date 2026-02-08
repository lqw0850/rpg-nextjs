import { GoogleGenAI } from "@google/genai";
import type { StoryNode } from "../types";
import type { Chat } from "@google/genai";
import { Validators } from "./validators";
import { GameEngine } from "./gameEngine";
import { ImageGenerator } from "./imageGenerator";
import { OcGenerator } from "./ocGenerator";
import { createSession, getSession, updateSessionActivity, cleanupExpiredSessions } from "./sessionManager";
import { createClient } from './supabase/supabaseServer';
import { databaseService } from "./databaseService";

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

  public async startGame(userId: string, ipName: string, charName: string, startNode: string, isOc: boolean, ocProfile?: string, isAnonymous?: boolean, artStyleId?: string): Promise<{ sessionId: string; storyNode: StoryNode; gameRecordId: number }> {
    return this.retryOperation(async () => {
      // 如果是匿名用户，不更新未完成游戏记录
      if (!isAnonymous) {
        await databaseService.updateAllIncompleteGameRecords(userId, 2);
      }

      const gameRecord = await databaseService.createGameRecord(userId, ipName, charName, isOc, ocProfile, isAnonymous, artStyleId);
      if (!gameRecord) {
        throw new Error("创建游戏记录失败");
      }

      const result = await this.gameEngine.startGame(ipName, charName, startNode, (sessionId, chat) => {
        createSession(sessionId, chat, ipName, ocProfile, artStyleId);
        const session = getSession(sessionId);
        if (session) {
          (session as any).gameRecordId = gameRecord.id;
          (session as any).isAnonymous = isAnonymous;
        }
      }, ocProfile);

      // 创建第一个轮次记录（在 startGame 完成后）
      const session = getSession(result.sessionId);
      if (session && !isAnonymous) {
        const roundId = await databaseService.createGameRound(
          gameRecord.id,
          1,
          result.storyNode.narrative,
          result.storyNode.choices,
          isAnonymous
        );
        
        if (roundId) {
          (session as any).currentRoundId = roundId;
        }
      }

      return {
        ...result,
        gameRecordId: gameRecord.id
      };
    });
  }

  public async makeChoice(sessionId: string, choiceText: string): Promise<StoryNode> {
    return this.retryOperation(async () => {
      const session = getSession(sessionId);
      if (!session) throw new Error("Game session not found.");
      
      updateSessionActivity(sessionId);
      
      // 更新当前轮次的用户选择
      const gameRecordId = (session as any).gameRecordId;
      const currentRoundId = (session as any).currentRoundId;
      
      if (gameRecordId && currentRoundId) {
        await databaseService.updateGameRoundChoice(currentRoundId, choiceText);
      }
      
      const storyNode = await this.gameEngine.makeChoice(session, choiceText);

      // 检查游戏是否结束，更新游戏记录状态
      if (gameRecordId && (storyNode.status === 'GAME_OVER' || storyNode.status === 'VICTORY')) {
        const gameStatus = storyNode.status === 'VICTORY' ? 1 : 2;
        this.updateGameStatus(gameRecordId, gameStatus);
      }

      // 创建新的轮次记录（为下一轮准备）
      if (gameRecordId) {
        const rounds = await databaseService.getGameRounds(gameRecordId);
        const roundNumber = rounds.length + 1;
        
        const newRoundId = await databaseService.createGameRound(
          gameRecordId,
          roundNumber,
          storyNode.narrative,
          storyNode.choices
        );
        
        if (newRoundId) {
          // 将新的轮次ID存储在会话中
          (session as any).currentRoundId = newRoundId;
        }
      }

      return storyNode;
    });
  }

  public async generateImage(sessionId: string, ipName: string, narrative: string, isOcPortrait: boolean = false, ocVisualDescription?: string, artStyle?: string): Promise<string | null> {
    try {
      let session = getSession(sessionId);
      
      // 如果是OC角色图像生成或原著角色预览且session不存在，创建一个临时session
      if (isOcPortrait && !session) {
        session = {
          id: sessionId,
          chat: { history: [] } as unknown as Chat, // 使用双重类型断言
          ipName,
          ocVisualDescription: ocVisualDescription || '',
          createdAt: new Date(),
          lastActivityAt: new Date()
        } as any;
      } else if (!session) {
        throw new Error("Game session not found.");
      }
      
      
      // 只有真实的session才需要更新活动时间
      if (sessionId !== 'character-image-generation') {
        updateSessionActivity(sessionId);
      }
      
      return await this.imageGenerator.generateImage(session!, narrative, isOcPortrait, ocVisualDescription, artStyle);
    } catch (error: any) {
      if (error.status === 'RESOURCE_EXHAUSTED' || error.code === 429) {
          console.warn("Image generation quota exceeded. Skipping image.");
          return null;
      }
      console.error("Failed to generate image:", error);
      return null;
    }
  }

  /**
   * 更新游戏记录状态
   * @param gameRecordId 游戏记录ID
   * @param status 状态 (0: 任务进行中, 1: 已通关, 2: 未通关)
   * @param characterSummary 角色总结
   * @returns 更新结果
   */
  public async updateGameStatus(gameRecordId: number, status: number, characterSummary?: string): Promise<boolean> {
    const result = await databaseService.updateGameRecordStatus(gameRecordId, status, characterSummary);
    return result !== null;
  }

  /**
   * 获取用户游戏记录
   * @param userId 用户ID
   * @returns 游戏记录列表
   */
  public async getUserGameRecords(userId: string) {
    return await databaseService.getUserGameRecords(userId);
  }

  /**
   * 获取游戏轮次记录
   * @param gameRecordId 游戏记录ID
   * @returns 轮次记录列表
   */
  public async getGameRounds(gameRecordId: number) {
    return await databaseService.getGameRounds(gameRecordId);
  }



  /**
   * 继续游戏
   * @param gameRecordId 游戏记录ID
   * @param ipName IP名称
   * @param characterName 角色名称
   * @param gameRounds 轮次记录
   * @param isOc 是否为OC角色
   * @param ocProfile OC档案
   * @returns 继续游戏结果
   */
  public async continueGame(gameRecordId: number, ipName: string, characterName: string, gameRounds: any[], isOc?: boolean, ocProfile?: any, artStyleId?: string): Promise<{ sessionId: string; storyNode: any }> {
    return this.retryOperation(async () => {
      // 获取最新轮次
      const latestRound = gameRounds[gameRounds.length - 1];
      
      // 创建新的会话
      const result = await this.gameEngine.continueGame(
        ipName, 
        characterName, 
        latestRound, 
        gameRounds.slice(0, -1), // 排除最新轮次，作为历史
        isOc,
        ocProfile,
        artStyleId
      );

      // 更新会话的游戏记录ID
      const session = getSession(result.sessionId);
      if (session) {
        (session as any).gameRecordId = gameRecordId;
        (session as any).currentRoundId = latestRound.id;
      }

      return result;
    });
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
