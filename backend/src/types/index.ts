export interface Player {
  id: string;
  name: string;
  socketId: string;
  team?: 'light' | 'dark';
  ready: boolean;
  connected: boolean;
  joinedAt: number;
}

export interface Lobby {
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  matchType: MatchType;
  factionMatchup: FactionMatchup;
  status: 'waiting' | 'starting' | 'in-progress' | 'ended';
  createdAt: number;
}

export type MatchType = 
  | 'galactic-assault'
  | 'supremacy'
  | 'heroes-vs-villains'
  | 'blast'
  | 'strike'
  | 'custom';

export interface FactionMatchup {
  lightSide: Faction;
  darkSide: Faction;
}

export type Faction = 
  | 'republic'
  | 'rebels' 
  | 'resistance'
  | 'separatists'
  | 'empire'
  | 'first-order';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  type: 'user' | 'system';
  lobbyId?: string;
}

export interface SyncEvent {
  type: 'match-start' | 'match-end' | 'team-assignment' | 'countdown';
  payload: any;
  timestamp: number;
  lobbyId: string;
}

export interface VoiceRoom {
  id: string;
  participants: Set<string>;
  createdAt: number;
}

export interface ServerConfig {
  port: number;
  corsOrigins: string[];
  rateLimit: {
    windowMs: number;
    max: number;
  };
  chat: {
    maxMessageLength: number;
    maxHistorySize: number;
  };
  lobbies: {
    maxLobbies: number;
    maxPlayersPerLobby: number;
    autoCleanupMinutes: number;
  };
}