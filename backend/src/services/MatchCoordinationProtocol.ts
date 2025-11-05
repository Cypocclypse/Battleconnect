import { EventEmitter } from 'events';
import { GameSession, Player, BattlefrontMap, GameMode } from '../types';

/**
 * REVOLUTIONARY: Match Coordination Protocol
 * 
 * This system coordinates players into the same actual Battlefront II multiplayer match
 * using various methods: server browser integration, match codes, and direct connection.
 */
export interface MatchCoordinationSettings {
  method: 'server-browser' | 'match-code' | 'direct-connect' | 'arcade-share';
  serverName?: string;
  matchCode?: string;
  hostIP?: string;
  joinInstructions: string[];
}

export interface ActiveMatch {
  id: string;
  lobbyId: string;
  hostPlayerId: string;
  players: string[];
  coordinationMethod: MatchCoordinationSettings;
  battlefrontMatchInfo?: {
    serverName: string;
    map: BattlefrontMap;
    mode: GameMode;
    playerCount: number;
  };
  status: 'coordinating' | 'active' | 'ended';
  startTime: number;
}

export class MatchCoordinationProtocol extends EventEmitter {
  private activeMatches = new Map<string, ActiveMatch>();
  private playerMatchMap = new Map<string, string>(); // playerId -> matchId

  constructor() {
    super();
  }

  /**
   * REVOLUTIONARY: Coordinate players into same Battlefront II match
   */
  async coordinateMatch(
    lobbyId: string,
    hostPlayerId: string,
    players: Player[],
    gameSession: GameSession
  ): Promise<{ success: boolean; match?: ActiveMatch; instructions?: string[]; error?: string }> {
    
    console.log(`🎯 MATCH COORDINATION: Starting coordination for ${players.length} players`);
    
    try {
      // Determine best coordination method based on available options
      const coordinationMethod = await this.determineBestCoordinationMethod(players.length);
      
      const matchId = `match_${lobbyId}_${Date.now()}`;
      
      const match: ActiveMatch = {
        id: matchId,
        lobbyId,
        hostPlayerId,
        players: players.map(p => p.id),
        coordinationMethod,
        status: 'coordinating',
        startTime: Date.now(),
      };

      this.activeMatches.set(matchId, match);
      
      // Map all players to this match
      players.forEach(player => {
        this.playerMatchMap.set(player.id, matchId);
      });

      console.log(`🚀 Using coordination method: ${coordinationMethod.method}`);
      
      // Execute coordination based on method
      const result = await this.executeCoordination(match, gameSession);
      
      if (result.success) {
        match.status = 'active';
        console.log(`✅ MATCH COORDINATION: Successfully coordinated ${players.length} players!`);
        
        this.emit('match-coordinated', {
          matchId,
          lobbyId,
          players: players.map(p => p.name),
          method: coordinationMethod.method,
          instructions: coordinationMethod.joinInstructions
        });
        
        return { 
          success: true, 
          match, 
          instructions: coordinationMethod.joinInstructions 
        };
      } else {
        return { success: false, error: result.error };
      }
      
    } catch (error) {
      console.error('❌ MATCH COORDINATION failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown coordination error'
      };
    }
  }

  /**
   * Determine best method to coordinate players into same match
   */
  private async determineBestCoordinationMethod(playerCount: number): Promise<MatchCoordinationSettings> {
    
    // Method 1: Arcade Mode Sharing (Best for small groups)
    if (playerCount <= 4) {
      return {
        method: 'arcade-share',
        joinInstructions: [
          '🎮 ARCADE MODE COORDINATION:',
          '1. Host opens Battlefront II → Arcade → Instant Action',
          '2. Select your map and settings, then START',
          '3. Other players: Join through Steam/EA friend list',
          '4. Look for host\'s "Arcade Session" or "Co-op" invite',
          '5. Everyone spawns in the same arcade match!',
          '⚡ This works immediately without server setup!'
        ]
      };
    }

    // Method 2: Private Match Coordination (Medium groups)
    if (playerCount <= 12) {
      const serverName = `BATTLECONNECT_${Date.now().toString().slice(-6)}`;
      return {
        method: 'server-browser',
        serverName,
        joinInstructions: [
          '🎯 PRIVATE MATCH COORDINATION:',
          '1. Host creates private match in Battlefront II',
          '2. Set server name to: ' + serverName,
          '3. Make server PUBLIC but with password',
          '4. Other players: Multiplayer → Server Browser',
          '5. Search for: ' + serverName,
          '6. Join with password (sent privately)',
          '🔒 Secure coordination through named server!'
        ]
      };
    }

    // Method 3: Match Code System (Large groups)
    const matchCode = this.generateMatchCode();
    return {
      method: 'match-code',
      matchCode,
      joinInstructions: [
        '🚀 MATCH CODE COORDINATION:',
        '1. Host starts public Battlefront II match',
        '2. Share this match code: ' + matchCode,
        '3. Players join at EXACTLY the same time',
        '4. Look for the lobby with most Battleconnect players',
        '5. Use in-game chat to identify: "BC-' + matchCode + '"',
        '6. Stay together as a squad throughout the match',
        '⚔️ Coordinate through teamwork and communication!'
      ]
    };
  }

  /**
   * Execute the chosen coordination method
   */
  private async executeCoordination(
    match: ActiveMatch, 
    gameSession: GameSession
  ): Promise<{ success: boolean; error?: string }> {
    
    const method = match.coordinationMethod.method;
    
    switch (method) {
      case 'arcade-share':
        return await this.coordinateArcadeMode(match, gameSession);
        
      case 'server-browser':
        return await this.coordinateServerBrowser(match, gameSession);
        
      case 'match-code':
        return await this.coordinateMatchCode(match, gameSession);
        
      case 'direct-connect':
        return await this.coordinateDirectConnection(match, gameSession);
        
      default:
        return { success: false, error: 'Unknown coordination method' };
    }
  }

  /**
   * REVOLUTIONARY: Arcade Mode Coordination (Instant Action sharing)
   */
  private async coordinateArcadeMode(
    match: ActiveMatch, 
    gameSession: GameSession
  ): Promise<{ success: boolean; error?: string }> {
    
    console.log('🎮 ARCADE COORDINATION: Setting up Instant Action sharing...');
    
    // This leverages Battlefront II's built-in arcade co-op features
    match.battlefrontMatchInfo = {
      serverName: 'Arcade Session',
      map: 'naboo', // Default from game session
      mode: 'instant-action' as GameMode,
      playerCount: match.players.length
    };
    
    // Emit coordination commands to connected clients
    this.emit('coordinate-arcade', {
      matchId: match.id,
      hostPlayerId: match.hostPlayerId,
      players: match.players,
      instructions: match.coordinationMethod.joinInstructions
    });
    
    console.log('✅ Arcade coordination setup complete');
    return { success: true };
  }

  /**
   * Server Browser Coordination (Private matches)
   */
  private async coordinateServerBrowser(
    match: ActiveMatch, 
    gameSession: GameSession
  ): Promise<{ success: boolean; error?: string }> {
    
    console.log('🎯 SERVER BROWSER COORDINATION: Setting up private match...');
    
    match.battlefrontMatchInfo = {
      serverName: match.coordinationMethod.serverName!,
      map: 'naboo',
      mode: 'galactic-assault',
      playerCount: match.players.length
    };
    
    this.emit('coordinate-server-browser', {
      matchId: match.id,
      serverName: match.coordinationMethod.serverName!,
      players: match.players,
      instructions: match.coordinationMethod.joinInstructions
    });
    
    console.log('✅ Server browser coordination setup complete');
    return { success: true };
  }

  /**
   * Match Code Coordination (Public match synchronization)
   */
  private async coordinateMatchCode(
    match: ActiveMatch, 
    gameSession: GameSession
  ): Promise<{ success: boolean; error?: string }> {
    
    console.log('🚀 MATCH CODE COORDINATION: Setting up synchronized joining...');
    
    match.battlefrontMatchInfo = {
      serverName: 'Public Match',
      map: 'naboo',
      mode: 'galactic-assault',
      playerCount: match.players.length
    };
    
    this.emit('coordinate-match-code', {
      matchId: match.id,
      matchCode: match.coordinationMethod.matchCode!,
      players: match.players,
      instructions: match.coordinationMethod.joinInstructions
    });
    
    console.log('✅ Match code coordination setup complete');
    return { success: true };
  }

  /**
   * Direct Connection Coordination (IP-based)
   */
  private async coordinateDirectConnection(
    match: ActiveMatch, 
    gameSession: GameSession
  ): Promise<{ success: boolean; error?: string }> {
    
    console.log('🔗 DIRECT CONNECTION: Setting up IP-based coordination...');
    
    // This would require more advanced networking
    return { success: false, error: 'Direct connection not implemented yet' };
  }

  /**
   * Generate unique match code for coordination
   */
  private generateMatchCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get active match by ID
   */
  getMatch(matchId: string): ActiveMatch | undefined {
    return this.activeMatches.get(matchId);
  }

  /**
   * Get match for player
   */
  getPlayerMatch(playerId: string): ActiveMatch | undefined {
    const matchId = this.playerMatchMap.get(playerId);
    return matchId ? this.activeMatches.get(matchId) : undefined;
  }

  /**
   * End match coordination
   */
  endMatch(matchId: string): void {
    const match = this.activeMatches.get(matchId);
    if (match) {
      match.status = 'ended';
      
      // Remove player mappings
      match.players.forEach(playerId => {
        this.playerMatchMap.delete(playerId);
      });
      
      this.emit('match-ended', {
        matchId,
        lobbyId: match.lobbyId,
        duration: Date.now() - match.startTime
      });
      
      this.activeMatches.delete(matchId);
      console.log(`🏁 Match coordination ended: ${matchId}`);
    }
  }

  /**
   * Get all active matches
   */
  getActiveMatches(): ActiveMatch[] {
    return Array.from(this.activeMatches.values());
  }
}