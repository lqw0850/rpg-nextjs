import { useState, useEffect, useCallback, useRef } from 'react';

export interface GameSessionData {
  id: string;
  gameRecordId: number;
  ipName: string;
  charName: string;
  isOc: boolean;
  ocVisualDescription: string;
  artStyleId: string;
  lastActivity: number;
  currentRoundId?: number;
  isAnonymous?: boolean;
  chatHistory: ChatHistoryItem[];
}

export interface ChatHistoryItem {
  role: 'user' | 'model';
  parts: any[];
}

const DB_NAME = 'RPGGameSessions';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;

class IndexedDBClient {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB 打开失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('lastActivity', 'lastActivity', { unique: false });
          store.createIndex('gameRecordId', 'gameRecordId', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async saveSession(session: GameSessionData): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(session);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSession(id: string): Promise<GameSessionData | undefined> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const session = request.result;
        if (session) {
          if (Date.now() - session.lastActivity > SESSION_TIMEOUT) {
            this.deleteSession(id);
            resolve(undefined);
          } else {
            resolve(session);
          }
        } else {
          resolve(undefined);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSession(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateSessionActivity(id: string): Promise<void> {
    const session = await this.getSession(id);
    if (session) {
      session.lastActivity = Date.now();
      await this.saveSession(session);
    }
  }

  async updateSessionChatHistory(sessionId: string, userChoice: string, storyNode: any): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      const userMessage: ChatHistoryItem = {
        role: 'user',
        parts: [{ text: `Player makes a choice: ${userChoice}` }]
      };
      
      const modelMessage: ChatHistoryItem = {
        role: 'model',
        parts: [{ text: JSON.stringify({
          narration: storyNode.narrative,
          options: storyNode.choices,
          status: storyNode.status,
          characterAnalysis: storyNode.characterAnalysis || ''
        }) }]
      };
      
      session.chatHistory.push(userMessage, modelMessage);
      await this.saveSession(session);
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const sessions = request.result;
        const now = Date.now();
        
        sessions.forEach((session: GameSessionData) => {
          if (now - session.lastActivity > SESSION_TIMEOUT) {
            this.deleteSession(session.id);
            console.log(`清理过期会话: ${session.id}`);
          }
        });
        
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
}

const indexedDBClient = new IndexedDBClient();

export function useIndexedDBSession(sessionId: string | null) {
  const [session, setSession] = useState<GameSessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    isInitialized.current = false;
  }, [sessionId]);

  const loadSession = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await indexedDBClient.init();
      const data = await indexedDBClient.getSession(sessionId);
      setSession(data || null);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load session:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const saveSession = useCallback(async (sessionData: GameSessionData) => {
    setLoading(true);
    setError(null);

    try {
      await indexedDBClient.init();
      await indexedDBClient.saveSession(sessionData);
      setSession(sessionData);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to save session:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSession = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      await indexedDBClient.init();
      await indexedDBClient.deleteSession(sessionId);
      setSession(null);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to delete session:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const updateActivity = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      await indexedDBClient.init();
      await indexedDBClient.updateSessionActivity(sessionId);
      const data = await indexedDBClient.getSession(sessionId);
      setSession(data || null);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to update activity:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const updateChatHistory = useCallback(async (userChoice: string, storyNode: any) => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      await indexedDBClient.init();
      await indexedDBClient.updateSessionChatHistory(sessionId, userChoice, storyNode);
      const data = await indexedDBClient.getSession(sessionId);
      setSession(data || null);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to update chat history:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId && !isInitialized.current) {
      loadSession();
      isInitialized.current = true;
    }
  }, [sessionId, loadSession]);

  return {
    session,
    loading,
    error,
    loadSession,
    saveSession,
    deleteSession,
    updateActivity,
    updateChatHistory
  };
}

export function useIndexedDBCleanup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cleanup = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await indexedDBClient.init();
      await indexedDBClient.cleanupExpiredSessions();
    } catch (err) {
      setError(err as Error);
      console.error('Failed to cleanup sessions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      cleanup();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [cleanup]);

  return { loading, error, cleanup };
}
