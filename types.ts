export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export interface Choice {
  id: string;
  text: string;
}

export interface StoryNode {
  narrative: string;
  choices: Choice[];
  status: 'CONTINUE' | 'GAME_OVER' | 'VICTORY';
  characterLabel?: string | null;
  characterAnalysis?: string | null;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}