export interface Player {
  id: string;
  name: string;
  team?: 'light' | 'dark';
  ready: boolean;
  connected: boolean;
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
}

export interface VoicePeer {
  id: string;
  username: string;
  muted: boolean;
  speaking: boolean;
}

export interface GameState {
  detected: boolean;
  running: boolean;
  platform: 'steam' | 'ea-app' | 'epic' | 'ps-remote' | 'unknown';
}

export interface SyncEvent {
  type: 'match-start' | 'match-end' | 'team-assignment' | 'countdown';
  payload: any;
  timestamp: number;
}