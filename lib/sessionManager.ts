import type { Chat } from "@google/genai";
import type { GameSession } from "./types";

// 使用 Node.js 的 global 对象存储全局会话，防止热重载时丢失会话
declare global {
  var __gameSessions: Map<string, GameSession>;
  var __gameServiceInstance: any;
}

// 初始化全局会话存储
if (!global.__gameSessions) {
  global.__gameSessions = new Map<string, GameSession>();
}

export const getGlobalSessions = (): Map<string, GameSession> => {
  return global.__gameSessions;
};

export const createSession = (
  id: string,
  chat: Chat,
  ipName: string,
  ocVisualDescription: string = ''
): GameSession => {
  const session: GameSession = {
    id,
    chat,
    ipName,
    ocVisualDescription,
    lastActivity: Date.now()
  };
  
  global.__gameSessions.set(id, session);
  return session;
};

export const getSession = (id: string): GameSession | undefined => {
  return global.__gameSessions.get(id);
};

export const updateSessionActivity = (id: string): void => {
  const session = global.__gameSessions.get(id);
  if (session) {
    session.lastActivity = Date.now();
  }
};

export const deleteSession = (id: string): void => {
  global.__gameSessions.delete(id);
};

export const cleanupExpiredSessions = (timeoutMs: number = 30 * 60 * 1000): void => {
  const now = Date.now();
  
  for (const [sessionId, session] of global.__gameSessions.entries()) {
    if (session.lastActivity && (now - session.lastActivity) > timeoutMs) {
      global.__gameSessions.delete(sessionId);
      console.log(`清理过期会话: ${sessionId}`);
    }
  }
};
