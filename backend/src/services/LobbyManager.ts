import { v4 as uuidv4 } from 'uuid';
import { Lobby, Player, MatchType, FactionMatchup, ServerConfig, AutoLaunchSettings, BattlefrontMap, GameMode, Era } from '../types';
import { validateUsername, validateLobbyName } from '../utils/sanitization';
import { DistributedGameManager } from './DistributedGameManager';
import { MatchCoordinationProtocol } from './MatchCoordinationProtocol';

export class LobbyManager {
  private lobbies = new Map<string, Lobby>();
  private playerLobbyMap = new Map<string, string>(); // playerId -> lobbyId
  private socketPlayerMap = new Map<string, string>(); // socketId -> playerId
  private distributedGameManager: DistributedGameManager;
  private matchCoordinationProtocol: MatchCoordinationProtocol;

  constructor(private config: ServerConfig) {
    this.distributedGameManager = new DistributedGameManager();
    this.matchCoordinationProtocol = new MatchCoordinationProtocol();
    this.setupDistributedGameEvents();
    this.setupMatchCoordinationEvents();
  }

  private setupDistributedGameEvents(): void {
    // Forward distributed game events to socket handlers
    this.distributedGameManager.on('auto-launch-game', (data) => {
      console.log('🚀 REVOLUTIONARY: Auto-launching game for lobby', data.lobbyId);
    });

    this.distributedGameManager.on('session-ready', (data) => {
      console.log('✅ REVOLUTIONARY: Session ready for lobby', data.lobbyId);
    });

    this.distributedGameManager.on('transfer-host', (data) => {
      console.log('🔄 REVOLUTIONARY: Host transferred in lobby', data.lobbyId);
    });
  }

  private setupMatchCoordinationEvents(): void {
    // Handle match coordination events
    this.matchCoordinationProtocol.on('match-coordinated', (data) => {
      console.log('🎯 MATCH COORDINATED: Players synchronized for', data.lobbyId);
    });

    this.matchCoordinationProtocol.on('coordinate-arcade', (data) => {
      console.log('🎮 ARCADE COORDINATION: Setting up Instant Action for', data.matchId);
    });

    this.matchCoordinationProtocol.on('coordinate-server-browser', (data) => {
      console.log('🎯 SERVER BROWSER: Setting up private match', data.serverName);
    });

    this.matchCoordinationProtocol.on('coordinate-match-code', (data) => {
      console.log('🚀 MATCH CODE: Synchronizing with code', data.matchCode);
    });
  }

  createLobby(
    socketId: string,
    data: {
      name: string;
      playerName: string;
      matchType: MatchType;
      factionMatchup: FactionMatchup;
      // REVOLUTIONARY: Auto-launch settings
      autoLaunch?: {
        map: BattlefrontMap;
        gameMode: GameMode;
        era: Era;
        playerCount: number;
        enableBots: boolean;
        difficulty: 'easy' | 'normal' | 'hard';
      };
    }
  ): { success: boolean; lobby?: Lobby; message?: string } {
    // Validate input
    if (!validateLobbyName(data.name)) {
      return { success: false, message: 'Invalid lobby name' };
    }

    if (!validateUsername(data.playerName)) {
      return { success: false, message: 'Invalid player name' };
    }

    // Check lobby limits
    if (this.lobbies.size >= this.config.lobbies.maxLobbies) {
      return { success: false, message: 'Maximum number of lobbies reached' };
    }

    // Check if player is already in a lobby
    const existingPlayerId = this.socketPlayerMap.get(socketId);
    if (existingPlayerId && this.playerLobbyMap.has(existingPlayerId)) {
      return { success: false, message: 'Already in a lobby' };
    }

    // Create new lobby
    const lobbyId = uuidv4();
    const playerId = uuidv4();
    
    const host: Player = {
      id: playerId,
      name: data.playerName,
      socketId,
      ready: false,
      connected: true,
      joinedAt: Date.now(),
    };

    // REVOLUTIONARY: Default auto-launch settings if not provided
    const autoLaunchSettings: AutoLaunchSettings = data.autoLaunch || {
      map: 'naboo', // Default to iconic Naboo
      gameMode: 'galactic-assault',
      era: 'clone-wars',
      playerCount: 20,
      enableBots: true,
      difficulty: 'normal'
    };

    const lobby: Lobby = {
      id: lobbyId,
      name: data.name,
      hostId: playerId,
      players: [host],
      maxPlayers: this.config.lobbies.maxPlayersPerLobby,
      matchType: data.matchType,
      factionMatchup: data.factionMatchup,
      status: 'waiting',
      createdAt: Date.now(),
      // REVOLUTIONARY: Add distributed multiplayer settings
      autoLaunchSettings,
    };

    // Store mappings
    this.lobbies.set(lobbyId, lobby);
    this.playerLobbyMap.set(playerId, lobbyId);
    this.socketPlayerMap.set(socketId, playerId);

    console.log(`🌟 REVOLUTIONARY LOBBY CREATED: ${data.name} (${lobbyId}) by ${data.playerName}`);
    console.log(`🚀 Auto-launching with settings:`, autoLaunchSettings);
    
    // REVOLUTIONARY: Immediately create distributed multiplayer session
    this.createDistributedSession(lobby, playerId, autoLaunchSettings);
    
    return { success: true, lobby };
  }

  /**
   * REVOLUTIONARY: Create distributed multiplayer session when lobby is created
   */
  private async createDistributedSession(
    lobby: Lobby, 
    hostPlayerId: string, 
    launchSettings: AutoLaunchSettings
  ): Promise<void> {
    try {
      const result = await this.distributedGameManager.createDistributedSession(
        lobby, 
        hostPlayerId, 
        launchSettings
      );
      
      if (result.success && result.session) {
        // Update lobby with session info
        const lobbyToUpdate = this.lobbies.get(lobby.id);
        if (lobbyToUpdate) {
          lobbyToUpdate.gameSession = result.session;
          lobbyToUpdate.status = 'starting';
          console.log(`✅ REVOLUTIONARY: Distributed session created for ${lobby.name}`);
        }
      } else {
        console.error(`❌ Failed to create distributed session: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error creating distributed session:', error);
    }
  }

  joinLobby(
    socketId: string,
    lobbyId: string,
    playerName: string
  ): { success: boolean; lobby?: Lobby; message?: string } {
    // Validate input
    if (!validateUsername(playerName)) {
      return { success: false, message: 'Invalid player name' };
    }

    // Check if lobby exists
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return { success: false, message: 'Lobby not found' };
    }

    // Check if lobby is full
    if (lobby.players.length >= lobby.maxPlayers) {
      return { success: false, message: 'Lobby is full' };
    }

    // Check if lobby is in progress
    if (lobby.status === 'in-progress') {
      return { success: false, message: 'Match already in progress' };
    }

    // Check if player is already in a lobby
    const existingPlayerId = this.socketPlayerMap.get(socketId);
    if (existingPlayerId && this.playerLobbyMap.has(existingPlayerId)) {
      return { success: false, message: 'Already in a lobby' };
    }

    // Create new player
    const playerId = uuidv4();
    const player: Player = {
      id: playerId,
      name: playerName,
      socketId,
      ready: false,
      connected: true,
      joinedAt: Date.now(),
    };

    // Add player to lobby
    lobby.players.push(player);
    
    // Assign team (simple alternating assignment)
    this.assignTeams(lobby);

    // Store mappings
    this.playerLobbyMap.set(playerId, lobbyId);
    this.socketPlayerMap.set(socketId, playerId);

    console.log(`🌟 REVOLUTIONARY: Player ${playerName} joined lobby ${lobby.name}`);
    
    // REVOLUTIONARY: Connect player to distributed session
    this.connectPlayerToDistributedSession(lobby, playerId);
    
    return { success: true, lobby };
  }

  /**
   * REVOLUTIONARY: Connect player to existing distributed session
   */
  private async connectPlayerToDistributedSession(
    lobby: Lobby,
    playerId: string
  ): Promise<void> {
    if (lobby.gameSession) {
      try {
        console.log(`🔗 REVOLUTIONARY: Connecting player ${playerId} to session ${lobby.gameSession.id}`);
        
        const result = await this.distributedGameManager.connectPlayerToSession(
          lobby.id,
          playerId
        );
        
        if (result.success) {
          console.log(`✅ REVOLUTIONARY: Player ${playerId} connected to distributed session`);
        } else {
          console.error(`❌ Failed to connect player to session: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ Error connecting player to distributed session:', error);
      }
    }
  }

  leaveLobby(socketId: string): {
    success: boolean;
    lobby?: Lobby;
    lobbyId?: string;
    playerName?: string;
  } {
    const playerId = this.socketPlayerMap.get(socketId);
    if (!playerId) {
      return { success: false };
    }

    const lobbyId = this.playerLobbyMap.get(playerId);
    if (!lobbyId) {
      return { success: false };
    }

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return { success: false };
    }

    const player = lobby.players.find(p => p.id === playerId);
    const playerName = player?.name;

    // Remove player from lobby
    lobby.players = lobby.players.filter(p => p.id !== playerId);

    // Clean up mappings
    this.playerLobbyMap.delete(playerId);
    this.socketPlayerMap.delete(socketId);

    // If lobby is empty or host left, disband lobby
    if (lobby.players.length === 0 || lobby.hostId === playerId) {
      this.lobbies.delete(lobbyId);
      
      // Clean up remaining player mappings
      lobby.players.forEach(p => {
        this.playerLobbyMap.delete(p.id);
        this.socketPlayerMap.delete(p.socketId);
      });

      console.log(`Lobby ${lobby.name} disbanded`);
      return { success: true, lobbyId, playerName };
    }

    // If host left but lobby not empty, assign new host
    if (lobby.hostId === playerId && lobby.players.length > 0) {
      lobby.hostId = lobby.players[0].id;
      console.log(`New host assigned in lobby ${lobby.name}: ${lobby.players[0].name}`);
    }

    // Reassign teams
    this.assignTeams(lobby);

    console.log(`Player ${playerName} left lobby ${lobby.name}`);
    
    return { success: true, lobby, lobbyId, playerName };
  }

  togglePlayerReady(socketId: string): { success: boolean; lobby?: Lobby } {
    const playerId = this.socketPlayerMap.get(socketId);
    if (!playerId) {
      return { success: false };
    }

    const lobbyId = this.playerLobbyMap.get(playerId);
    if (!lobbyId) {
      return { success: false };
    }

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return { success: false };
    }

    const player = lobby.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false };
    }

    player.ready = !player.ready;

    return { success: true, lobby };
  }

  startMatch(socketId: string): { success: boolean; lobby?: Lobby; message?: string } {
    const playerId = this.socketPlayerMap.get(socketId);
    if (!playerId) {
      return { success: false, message: 'Player not found' };
    }

    const lobbyId = this.playerLobbyMap.get(playerId);
    if (!lobbyId) {
      return { success: false, message: 'Not in a lobby' };
    }

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return { success: false, message: 'Lobby not found' };
    }

    // Check if player is host
    if (lobby.hostId !== playerId) {
      return { success: false, message: 'Only host can start match' };
    }

    // Check if all players are ready
    if (!lobby.players.every(p => p.ready)) {
      return { success: false, message: 'All players must be ready' };
    }

    // Check minimum players (at least 2)
    if (lobby.players.length < 2) {
      return { success: false, message: 'Need at least 2 players' };
    }

    // Update lobby status
    lobby.status = 'starting';

    // Final team assignment
    this.assignTeams(lobby);

    console.log(`🎯 MATCH STARTING: Coordinating ${lobby.players.length} players for ${lobby.name}`);

    // REVOLUTIONARY: Start match coordination protocol
    this.initiateMatchCoordination(lobby, playerId);

    return { success: true, lobby };
  }

  /**
   * REVOLUTIONARY: Initiate match coordination protocol
   */
  private async initiateMatchCoordination(
    lobby: Lobby,
    hostPlayerId: string
  ): Promise<void> {
    try {
      if (lobby.gameSession) {
        console.log(`🎯 INITIATING MATCH COORDINATION for ${lobby.name}`);
        
        const result = await this.matchCoordinationProtocol.coordinateMatch(
          lobby.id,
          hostPlayerId,
          lobby.players,
          lobby.gameSession
        );
        
        if (result.success && result.match) {
          console.log('✅ MATCH COORDINATION: Successfully coordinated players!');
          console.log('📋 Join Instructions:');
          result.instructions?.forEach(instruction => {
            console.log(`   ${instruction}`);
          });
          
          // Update lobby status to in-progress
          lobby.status = 'in-progress';
          
        } else {
          console.error(`❌ Match coordination failed: ${result.error}`);
          lobby.status = 'waiting'; // Revert status
        }
      }
    } catch (error) {
      console.error('❌ Error initiating match coordination:', error);
      lobby.status = 'waiting'; // Revert status
    }
  }

  findPlayerBySocketId(socketId: string): Player | undefined {
    const playerId = this.socketPlayerMap.get(socketId);
    if (!playerId) return undefined;

    const lobbyId = this.playerLobbyMap.get(playerId);
    if (!lobbyId) return undefined;

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return undefined;

    return lobby.players.find(p => p.id === playerId);
  }

  findLobbyByPlayerId(playerId: string): Lobby | undefined {
    const lobbyId = this.playerLobbyMap.get(playerId);
    if (!lobbyId) return undefined;

    return this.lobbies.get(lobbyId);
  }

  getPublicLobbies(): Lobby[] {
    return Array.from(this.lobbies.values())
      .filter(lobby => lobby.status === 'waiting')
      .map(lobby => ({
        ...lobby,
        players: lobby.players.map(p => ({
          ...p,
          socketId: '', // Don't expose socket IDs
        })),
      }));
  }

  cleanupInactiveLobbies(): number {
    const now = Date.now();
    const maxAge = this.config.lobbies.autoCleanupMinutes * 60 * 1000;
    let cleanedCount = 0;

    for (const [lobbyId, lobby] of this.lobbies.entries()) {
      // Clean up old waiting lobbies
      if (lobby.status === 'waiting' && now - lobby.createdAt > maxAge) {
        // Clean up player mappings
        lobby.players.forEach(player => {
          this.playerLobbyMap.delete(player.id);
          this.socketPlayerMap.delete(player.socketId);
        });

        this.lobbies.delete(lobbyId);
        cleanedCount++;
        console.log(`Cleaned up inactive lobby: ${lobby.name}`);
      }
      
      // Clean up ended matches
      else if (lobby.status === 'ended' && now - lobby.createdAt > 10 * 60 * 1000) {
        // Clean up player mappings
        lobby.players.forEach(player => {
          this.playerLobbyMap.delete(player.id);
          this.socketPlayerMap.delete(player.socketId);
        });

        this.lobbies.delete(lobbyId);
        cleanedCount++;
        console.log(`Cleaned up ended match: ${lobby.name}`);
      }
    }

    return cleanedCount;
  }

  private assignTeams(lobby: Lobby): void {
    // Simple alternating team assignment
    lobby.players.forEach((player, index) => {
      player.team = index % 2 === 0 ? 'light' : 'dark';
    });
  }
}