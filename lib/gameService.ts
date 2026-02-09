import { GoogleGenAI } from "@google/genai";
import type { StoryNode } from "../types";
import type { Chat } from "@google/genai";
import { Validators } from "./validators";
import { GameEngine } from "./gameEngine";
import { ImageGenerator } from "./imageGenerator";
import { OcGenerator } from "./ocGenerator";
import { databaseService } from "./databaseService";

export class GameService {
  private validators: Validators;
  private gameEngine: GameEngine;
  private imageGenerator: ImageGenerator;
  private ocGenerator: OcGenerator;

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

  public async startGame(userId: string, ipName: string, charName: string, startNode: string, isOc: boolean, ocProfile?: string, isAnonymous?: boolean, artStyleId?: string): Promise<{ sessionId: string; storyNode: StoryNode; gameRecordId: number; chatHistory: any[] }> {
    if (!isAnonymous) {
      await databaseService.updateAllIncompleteGameRecords(userId, 2);
    }

    const gameRecord = await databaseService.createGameRecord(userId, ipName, charName, isOc, ocProfile, isAnonymous, artStyleId);
    if (!gameRecord) {
      throw new Error("创建游戏记录失败");
    }

    const result = await this.retryOperation(async () => {
      return await this.gameEngine.startGame(ipName, charName, startNode, isOc, ocProfile, gameRecord.id, artStyleId);
    });

    if (!isAnonymous) {
      await databaseService.createGameRound(
        gameRecord.id,
        1,
        result.storyNode.narrative,
        result.storyNode.choices,
        isAnonymous
      );
    }

    return {
      sessionId: result.sessionId,
      storyNode: result.storyNode,
      gameRecordId: gameRecord.id,
      chatHistory: result.chatHistory
    };
  }

  public async makeChoice(gameRecordId: number, choiceText: string, chatHistory: any[], ipName: string, charName: string, isOc: boolean, ocProfile?: string, artStyleId?: string): Promise<StoryNode> {
    const gameRecord = await databaseService.getGameRecordById(gameRecordId);
    if (!gameRecord) {
      throw new Error("Game record not found.");
    }

    const gameRounds = await databaseService.getGameRounds(gameRecordId);
    if (!gameRounds || gameRounds.length === 0) {
      throw new Error("No game rounds found.");
    }

    const currentRoundId = gameRounds[gameRounds.length - 1].id;
    await databaseService.updateGameRoundChoice(currentRoundId, choiceText);

    const history = [...chatHistory];
    history.push({
      role: 'model',
      parts: [{ text: JSON.stringify({
        narrative: gameRounds[gameRounds.length - 1].plot,
        choices: gameRounds[gameRounds.length - 1].options,
        status: 'CONTINUE',
        characterAnalysis: ''
      }) }]
    });
    history.push({
      role: 'user',
      parts: [{ text: `Player makes a choice: ${choiceText}` }]
    });

    const storyNode = await this.retryOperation(async () => {
      return await this.gameEngine.makeChoiceWithHistory(history, choiceText, ipName, charName, isOc, ocProfile, artStyleId);
    });

    if (storyNode.status === 'GAME_OVER' || storyNode.status === 'VICTORY') {
      const gameStatus = storyNode.status === 'VICTORY' ? 1 : 2;
      this.updateGameStatus(gameRecordId, gameStatus);
    }

    const rounds = await databaseService.getGameRounds(gameRecordId);
    const roundNumber = rounds.length + 1;
    
    await databaseService.createGameRound(
      gameRecordId,
      roundNumber,
      storyNode.narrative,
      storyNode.choices
    );

    return storyNode;
  }

  public async generateImage(ipName: string, narrative: string, isOcPortrait: boolean = false, ocVisualDescription?: string, artStyle?: string): Promise<string | null> {
    try {
      return await this.imageGenerator.generateImage(ipName, narrative, isOcPortrait, ocVisualDescription, artStyle);
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
      const latestRound = gameRounds[gameRounds.length - 1];
      
      const sessionId = crypto.randomUUID();

      const initialStoryNode: StoryNode = {
      narrative: latestRound.plot,
      choices: latestRound.options.map((opt: any, index: number) => ({
        id: String.fromCharCode(65 + index),
        text: opt
      })),
      status: 'CONTINUE',
      characterAnalysis: ''
    };

      return {
        sessionId: sessionId,
        storyNode: initialStoryNode
      };
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
