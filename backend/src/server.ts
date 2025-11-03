import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { LobbyManager } from './services/LobbyManager';
import { ChatService } from './services/ChatService';
import { VoiceService } from './services/VoiceService';
import { SyncService } from './services/SyncService';
import { GameHostingService } from './services/GameHostingService';
import { sanitizeInput } from './utils/sanitization';
import { ServerConfig } from './types';

dotenv.config();

const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3001'),
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  chat: {
    maxMessageLength: 500,
    maxHistorySize: 100,
  },
  lobbies: {
    maxLobbies: 50,
    maxPlayersPerLobby: 20,
    autoCleanupMinutes: 30,
  },
};

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit(config.rateLimit);
app.use(limiter);

// Parse JSON
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Initialize services
const lobbyManager = new LobbyManager(config);
const chatService = new ChatService(config);
const voiceService = new VoiceService();
const syncService = new SyncService();
const gameHostingService = new GameHostingService();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Lobby events
  socket.on('get-lobbies', () => {
    const lobbies = lobbyManager.getPublicLobbies();
    socket.emit('lobby-list', lobbies);
  });

  socket.on('create-lobby', (data) => {
    try {
      const sanitizedData = {
        name: sanitizeInput(data.name, 30),
        playerName: sanitizeInput(data.playerName, 20),
        matchType: data.matchType,
        factionMatchup: data.factionMatchup,
      };

      const result = lobbyManager.createLobby(socket.id, sanitizedData);
      
      if (result.success && result.lobby) {
        socket.join(result.lobby.id);
        socket.emit('lobby-joined', result.lobby);
        
        // Notify all clients of updated lobby list
        io.emit('lobby-list', lobbyManager.getPublicLobbies());
        
        // Add system message
        const message = chatService.addSystemMessage(
          `${sanitizedData.playerName} created lobby: ${sanitizedData.name}`,
          result.lobby.id
        );
        io.to(result.lobby.id).emit('chat-message', message);
      } else {
        socket.emit('error', { message: result.message });
      }
    } catch (error) {
      console.error('Create lobby error:', error);
      socket.emit('error', { message: 'Failed to create lobby' });
    }
  });

  socket.on('join-lobby', (data) => {
    try {
      const sanitizedData = {
        lobbyId: sanitizeInput(data.lobbyId, 36),
        playerName: sanitizeInput(data.playerName, 20),
      };

      const result = lobbyManager.joinLobby(socket.id, sanitizedData.lobbyId, sanitizedData.playerName);
      
      if (result.success && result.lobby) {
        socket.join(result.lobby.id);
        socket.emit('lobby-joined', result.lobby);
        
        // Notify lobby members
        socket.to(result.lobby.id).emit('lobby-updated', result.lobby);
        
        // Update lobby list for all
        io.emit('lobby-list', lobbyManager.getPublicLobbies());
        
        // Add system message
        const message = chatService.addSystemMessage(
          `${sanitizedData.playerName} joined the lobby`,
          result.lobby.id
        );
        io.to(result.lobby.id).emit('chat-message', message);
      } else {
        socket.emit('error', { message: result.message });
      }
    } catch (error) {
      console.error('Join lobby error:', error);
      socket.emit('error', { message: 'Failed to join lobby' });
    }
  });

  socket.on('leave-lobby', () => {
    try {
      const result = lobbyManager.leaveLobby(socket.id);
      
      if (result.success) {
        socket.leave(result.lobbyId!);
        socket.emit('lobby-left');
        
        if (result.lobby) {
          // Notify remaining members
          socket.to(result.lobbyId!).emit('lobby-updated', result.lobby);
        } else {
          // Lobby was disbanded
          io.to(result.lobbyId!).emit('lobby-disbanded');
        }
        
        // Update lobby list
        io.emit('lobby-list', lobbyManager.getPublicLobbies());
        
        // Add system message if lobby still exists
        if (result.lobby && result.playerName) {
          const message = chatService.addSystemMessage(
            `${result.playerName} left the lobby`,
            result.lobbyId!
          );
          io.to(result.lobbyId!).emit('chat-message', message);
        }
      }
    } catch (error) {
      console.error('Leave lobby error:', error);
      socket.emit('error', { message: 'Failed to leave lobby' });
    }
  });

  socket.on('toggle-ready', () => {
    try {
      const result = lobbyManager.togglePlayerReady(socket.id);
      
      if (result.success && result.lobby) {
        io.to(result.lobby.id).emit('lobby-updated', result.lobby);
      }
    } catch (error) {
      console.error('Toggle ready error:', error);
    }
  });

  socket.on('start-match', () => {
    try {
      const result = lobbyManager.startMatch(socket.id);
      
      if (result.success && result.lobby) {
        // Start countdown
        syncService.startMatchCountdown(result.lobby.id, (seconds) => {
          io.to(result.lobby!.id).emit('match-countdown', seconds);
        }, () => {
          // Match started
          io.to(result.lobby!.id).emit('match-started');
          
          // Add sync event
          const event = syncService.createSyncEvent('match-start', {
            lobbyId: result.lobby!.id,
            factionMatchup: result.lobby!.factionMatchup,
          }, result.lobby!.id);
          
          io.to(result.lobby!.id).emit('sync-event', event);
        });
        
        io.to(result.lobby.id).emit('lobby-updated', result.lobby);
      }
    } catch (error) {
      console.error('Start match error:', error);
    }
  });

  // Chat events
  socket.on('send-chat-message', (data) => {
    try {
      const sanitizedData = {
        message: sanitizeInput(data.message, config.chat.maxMessageLength),
        username: sanitizeInput(data.username, 20),
      };

      const player = lobbyManager.findPlayerBySocketId(socket.id);
      const lobbyId = player ? lobbyManager.findLobbyByPlayerId(player.id)?.id : undefined;

      const message = chatService.addUserMessage(
        socket.id,
        sanitizedData.username,
        sanitizedData.message,
        lobbyId
      );

      if (lobbyId) {
        io.to(lobbyId).emit('chat-message', message);
      } else {
        io.emit('chat-message', message);
      }
    } catch (error) {
      console.error('Send chat message error:', error);
    }
  });

  socket.on('get-chat-history', () => {
    const player = lobbyManager.findPlayerBySocketId(socket.id);
    const lobbyId = player ? lobbyManager.findLobbyByPlayerId(player.id)?.id : undefined;
    
    const history = chatService.getHistory(lobbyId);
    socket.emit('chat-history', history);
  });

  // Voice events
  socket.on('voice-join', () => {
    const player = lobbyManager.findPlayerBySocketId(socket.id);
    if (player) {
      const lobbyId = lobbyManager.findLobbyByPlayerId(player.id)?.id;
      if (lobbyId) {
        voiceService.joinRoom(socket.id, lobbyId);
        socket.to(lobbyId).emit('voice-peer-joined', {
          id: socket.id,
          username: player.name,
          muted: false,
          speaking: false,
        });
      }
    }
  });

  socket.on('voice-leave', () => {
    const rooms = voiceService.leaveAllRooms(socket.id);
    rooms.forEach(roomId => {
      socket.to(roomId).emit('voice-peer-left', socket.id);
    });
  });

  socket.on('voice-offer', (data) => {
    socket.to(data.to).emit('voice-offer', {
      from: socket.id,
      offer: data.offer,
    });
  });

  socket.on('voice-answer', (data) => {
    socket.to(data.to).emit('voice-answer', {
      from: socket.id,
      answer: data.answer,
    });
  });

  socket.on('voice-ice-candidate', (data) => {
    socket.to(data.to).emit('voice-ice-candidate', {
      from: socket.id,
      candidate: data.candidate,
    });
  });

  // Game Hosting events
  socket.on('register-player', (data) => {
    const { playerId, playerName, hasGame } = data;
    if (!playerId || !playerName) return;

    gameHostingService.addPlayer(playerId, playerName, hasGame || false, socket.id);
    gameHostingService.broadcastAvailableHosts(io);
  });

  socket.on('set-hosting-availability', (data) => {
    const { playerId, available } = data;
    if (!playerId) return;

    gameHostingService.setHostingAvailability(playerId, available, io);
  });

  socket.on('request-hosting', (data) => {
    const { requesterId, hostId, message } = data;
    if (!requesterId || !hostId) return;

    gameHostingService.requestHosting(requesterId, hostId, message || '', io);
  });

  socket.on('respond-to-hosting-request', (data) => {
    const { requestId, hostId, accept, reason } = data;
    if (!requestId || !hostId) return;

    gameHostingService.respondToHostingRequest(requestId, hostId, accept, reason || '', io);
  });

  socket.on('end-hosting-session', (data) => {
    const { hostId } = data;
    if (!hostId) return;

    gameHostingService.endHostingSession(hostId, io);
  });

  socket.on('disconnect-from-host', (data) => {
    const { guestId } = data;
    if (!guestId) return;

    gameHostingService.disconnectGuest(guestId, io);
  });

  socket.on('request-lobby-hosting', (data) => {
    const { requesterId, requesterName, lobbyId, message } = data;
    if (!requesterId || !lobbyId) return;

    // Send hosting request to all players in the lobby
    socket.to(lobbyId).emit('lobby-hosting-request', {
      requesterId,
      requesterName,
      lobbyId,
      message,
      timestamp: Date.now()
    });

    console.log(`Lobby hosting request: ${requesterName} wants to join lobby ${lobbyId}`);
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Leave lobby
    const leaveResult = lobbyManager.leaveLobby(socket.id);
    if (leaveResult.success && leaveResult.lobbyId) {
      if (leaveResult.lobby) {
        socket.to(leaveResult.lobbyId).emit('lobby-updated', leaveResult.lobby);
      } else {
        io.to(leaveResult.lobbyId).emit('lobby-disbanded');
      }
      
      io.emit('lobby-list', lobbyManager.getPublicLobbies());
      
      if (leaveResult.lobby && leaveResult.playerName) {
        const message = chatService.addSystemMessage(
          `${leaveResult.playerName} disconnected`,
          leaveResult.lobbyId
        );
        io.to(leaveResult.lobbyId).emit('chat-message', message);
      }
    }
    
    // Leave voice rooms
    const voiceRooms = voiceService.leaveAllRooms(socket.id);
    voiceRooms.forEach(roomId => {
      socket.to(roomId).emit('voice-peer-left', socket.id);
    });

    // Clean up game hosting
    gameHostingService.removePlayerBySocketId(socket.id, io);
  });
});

// Auto-cleanup inactive lobbies
setInterval(() => {
  const cleanedCount = lobbyManager.cleanupInactiveLobbies();
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} inactive lobbies`);
    io.emit('lobby-list', lobbyManager.getPublicLobbies());
  }
}, config.lobbies.autoCleanupMinutes * 60 * 1000);

// Auto-cleanup chat history
setInterval(() => {
  chatService.cleanupOldMessages();
}, 60 * 60 * 1000); // Every hour

server.listen(config.port, () => {
  console.log(`Battleconnect server running on port ${config.port}`);
  console.log(`CORS origins: ${config.corsOrigins.join(', ')}`);
});