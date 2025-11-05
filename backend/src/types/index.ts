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
  // Revolutionary distributed multiplayer
  gameSession?: GameSession;
  autoLaunchSettings?: AutoLaunchSettings;
}

export interface GameSession {
  id: string;
  hostGameProcess?: number; // PID of host's Battlefront II
  worldOverride: WorldOverrideSettings;
  connectedPlayers: string[]; // Player IDs connected to the session
  status: 'launching' | 'active' | 'transferring-host' | 'crashed';
  startTime: number;
}

export interface AutoLaunchSettings {
  map: BattlefrontMap;
  gameMode: GameMode;
  era: Era;
  playerCount: number;
  enableBots: boolean;
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface WorldOverrideSettings {
  originalMode: 'singleplayer' | 'arcade' | 'instant-action';
  overrideToMultiplayer: boolean;
  hostPlayerId: string;
  allowJoinInProgress: boolean;
  maxPlayers: number;
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

// Real Battlefront II content
export type Era = 'clone-wars' | 'galactic-civil-war' | 'sequel-era';

export type GameMode = 
  | 'galactic-assault'
  | 'capital-supremacy' 
  | 'heroes-vs-villains'
  | 'hero-showdown'
  | 'blast'
  | 'strike'
  | 'extraction'
  | 'jetpack-cargo'
  | 'ewok-hunt'
  | 'co-op'
  | 'instant-action';

export type BattlefrontMap = 
  // Clone Wars Era
  | 'kamino' | 'naboo' | 'kashyyyk' | 'geonosis' | 'felucia'
  // Galactic Civil War Era  
  | 'tatooine' | 'hoth' | 'endor' | 'yavin-4' | 'death-star-ii'
  // Sequel Era
  | 'jakku' | 'takodana' | 'starkiller-base' | 'crait' | 'ajan-kloss';

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