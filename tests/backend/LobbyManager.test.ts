import { LobbyManager } from '../../backend/src/services/LobbyManager';
import { ServerConfig } from '../../backend/src/types';

describe('LobbyManager', () => {
  let lobbyManager: LobbyManager;
  let mockConfig: ServerConfig;

  beforeEach(() => {
    mockConfig = {
      port: 3001,
      corsOrigins: ['http://localhost:3000'],
      rateLimit: { windowMs: 15 * 60 * 1000, max: 100 },
      chat: { maxMessageLength: 500, maxHistorySize: 100 },
      lobbies: { maxLobbies: 50, maxPlayersPerLobby: 20, autoCleanupMinutes: 30 },
    };
    lobbyManager = new LobbyManager(mockConfig);
  });

  describe('createLobby', () => {
    it('should create a lobby successfully', () => {
      const result = lobbyManager.createLobby('socket1', {
        name: 'Test Lobby',
        playerName: 'TestPlayer',
        matchType: 'galactic-assault',
        factionMatchup: { lightSide: 'rebels', darkSide: 'empire' },
      });

      expect(result.success).toBe(true);
      expect(result.lobby).toBeDefined();
      expect(result.lobby?.name).toBe('Test Lobby');
      expect(result.lobby?.players).toHaveLength(1);
    });

    it('should reject invalid lobby names', () => {
      const result = lobbyManager.createLobby('socket1', {
        name: 'AB', // Too short
        playerName: 'TestPlayer',
        matchType: 'galactic-assault',
        factionMatchup: { lightSide: 'rebels', darkSide: 'empire' },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid lobby name');
    });

    it('should reject invalid player names', () => {
      const result = lobbyManager.createLobby('socket1', {
        name: 'Test Lobby',
        playerName: 'A', // Too short
        matchType: 'galactic-assault',
        factionMatchup: { lightSide: 'rebels', darkSide: 'empire' },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid player name');
    });
  });

  describe('joinLobby', () => {
    it('should allow player to join existing lobby', () => {
      // Create lobby first
      const createResult = lobbyManager.createLobby('socket1', {
        name: 'Test Lobby',
        playerName: 'Host',
        matchType: 'galactic-assault',
        factionMatchup: { lightSide: 'rebels', darkSide: 'empire' },
      });

      expect(createResult.success).toBe(true);
      
      // Join the lobby
      const joinResult = lobbyManager.joinLobby('socket2', createResult.lobby!.id, 'Player2');

      expect(joinResult.success).toBe(true);
      expect(joinResult.lobby?.players).toHaveLength(2);
      expect(joinResult.lobby?.players[1].name).toBe('Player2');
    });

    it('should reject joining non-existent lobby', () => {
      const result = lobbyManager.joinLobby('socket2', 'fake-lobby-id', 'Player2');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Lobby not found');
    });
  });

  describe('leaveLobby', () => {
    it('should allow player to leave lobby', () => {
      // Create and join lobby
      const createResult = lobbyManager.createLobby('socket1', {
        name: 'Test Lobby',
        playerName: 'Host',
        matchType: 'galactic-assault',
        factionMatchup: { lightSide: 'rebels', darkSide: 'empire' },
      });

      lobbyManager.joinLobby('socket2', createResult.lobby!.id, 'Player2');

      // Leave lobby
      const leaveResult = lobbyManager.leaveLobby('socket2');

      expect(leaveResult.success).toBe(true);
      expect(leaveResult.lobby?.players).toHaveLength(1);
      expect(leaveResult.playerName).toBe('Player2');
    });

    it('should disband lobby when host leaves', () => {
      // Create lobby
      const createResult = lobbyManager.createLobby('socket1', {
        name: 'Test Lobby',
        playerName: 'Host',
        matchType: 'galactic-assault',
        factionMatchup: { lightSide: 'rebels', darkSide: 'empire' },
      });

      // Host leaves
      const leaveResult = lobbyManager.leaveLobby('socket1');

      expect(leaveResult.success).toBe(true);
      expect(leaveResult.lobby).toBeUndefined(); // Lobby disbanded
      expect(leaveResult.lobbyId).toBe(createResult.lobby!.id);
    });
  });

  describe('startMatch', () => {
    it('should start match when all players are ready', () => {
      // Create lobby
      const createResult = lobbyManager.createLobby('socket1', {
        name: 'Test Lobby',
        playerName: 'Host',
        matchType: 'galactic-assault',
        factionMatchup: { lightSide: 'rebels', darkSide: 'empire' },
      });

      // Join player
      lobbyManager.joinLobby('socket2', createResult.lobby!.id, 'Player2');

      // Set players ready
      lobbyManager.togglePlayerReady('socket1');
      lobbyManager.togglePlayerReady('socket2');

      // Start match
      const startResult = lobbyManager.startMatch('socket1');

      expect(startResult.success).toBe(true);
      expect(startResult.lobby?.status).toBe('starting');
    });

    it('should reject start match if players not ready', () => {
      // Create lobby
      const createResult = lobbyManager.createLobby('socket1', {
        name: 'Test Lobby',
        playerName: 'Host',
        matchType: 'galactic-assault',
        factionMatchup: { lightSide: 'rebels', darkSide: 'empire' },
      });

      // Join player but don't set ready
      lobbyManager.joinLobby('socket2', createResult.lobby!.id, 'Player2');

      // Try to start match
      const startResult = lobbyManager.startMatch('socket1');

      expect(startResult.success).toBe(false);
      expect(startResult.message).toContain('All players must be ready');
    });

    it('should reject start match if not host', () => {
      // Create lobby
      const createResult = lobbyManager.createLobby('socket1', {
        name: 'Test Lobby',
        playerName: 'Host',
        matchType: 'galactic-assault',
        factionMatchup: { lightSide: 'rebels', darkSide: 'empire' },
      });

      // Join player
      lobbyManager.joinLobby('socket2', createResult.lobby!.id, 'Player2');

      // Non-host tries to start match
      const startResult = lobbyManager.startMatch('socket2');

      expect(startResult.success).toBe(false);
      expect(startResult.message).toContain('Only host can start match');
    });
  });
});