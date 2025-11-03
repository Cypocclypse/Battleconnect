import { Socket } from 'socket.io';

interface Player {
  id: string;
  name: string;
  hasGame: boolean;
  isHost: boolean;
  isGuest: boolean;
  hostId?: string;
  socketId: string;
}

interface HostingRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  hostId: string;
  message: string;
  timestamp: number;
}

interface HostingSession {
  id: string;
  hostId: string;
  guestId: string;
  startTime: number;
  active: boolean;
}

export class GameHostingService {
  private players: Map<string, Player> = new Map();
  private hostingRequests: Map<string, HostingRequest> = new Map();
  private hostingSessions: Map<string, HostingSession> = new Map();
  private availableHosts: Set<string> = new Set();

  addPlayer(playerId: string, playerName: string, hasGame: boolean, socketId: string): void {
    const player: Player = {
      id: playerId,
      name: playerName,
      hasGame,
      isHost: false,
      isGuest: false,
      socketId,
    };
    
    this.players.set(playerId, player);
    console.log(`Player added to hosting service: ${playerName} (Has game: ${hasGame})`);
  }

  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    // If player was hosting, end the session
    if (player.isHost) {
      this.endHostingSession(playerId);
    }

    // If player was a guest, disconnect them
    if (player.isGuest && player.hostId) {
      this.disconnectGuest(playerId);
    }

    // Remove from available hosts
    this.availableHosts.delete(playerId);
    this.players.delete(playerId);

    console.log(`Player removed from hosting service: ${player.name}`);
  }

  removePlayerBySocketId(socketId: string, io?: any): void {
    // Find player by socket ID
    let playerToRemove: Player | undefined;
    for (const [playerId, player] of this.players.entries()) {
      if (player.socketId === socketId) {
        playerToRemove = player;
        break;
      }
    }

    if (playerToRemove) {
      this.removePlayer(playerToRemove.id);
      if (io) {
        this.broadcastAvailableHosts(io);
      }
    }
  }

  setHostingAvailability(playerId: string, available: boolean, io: any): void {
    const player = this.players.get(playerId);
    if (!player || !player.hasGame) return;

    if (available) {
      this.availableHosts.add(playerId);
      console.log(`${player.name} is now available for hosting`);
    } else {
      this.availableHosts.delete(playerId);
      // End any active hosting session
      if (player.isHost) {
        this.endHostingSession(playerId, io);
      }
      console.log(`${player.name} is no longer available for hosting`);
    }

    // Broadcast updated host list
    this.broadcastAvailableHosts(io);
  }

  requestHosting(requesterId: string, hostId: string, message: string, io: any): void {
    const requester = this.players.get(requesterId);
    const host = this.players.get(hostId);

    if (!requester || !host) {
      console.error('Invalid requester or host ID');
      return;
    }

    if (!this.availableHosts.has(hostId)) {
      io.to(requester.socketId).emit('hosting-rejected', {
        hostId,
        reason: 'Host is not available'
      });
      return;
    }

    if (host.isHost) {
      io.to(requester.socketId).emit('hosting-rejected', {
        hostId,
        reason: 'Host is already hosting another player'
      });
      return;
    }

    // Create hosting request
    const request: HostingRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requesterId,
      requesterName: requester.name,
      hostId,
      message,
      timestamp: Date.now(),
    };

    this.hostingRequests.set(request.id, request);

    // Send request to host
    io.to(host.socketId).emit('hosting-request', request);

    console.log(`Hosting request sent: ${requester.name} -> ${host.name}`);
  }

  respondToHostingRequest(requestId: string, hostId: string, accept: boolean, reason: string, io: any): void {
    const request = this.hostingRequests.get(requestId);
    const host = this.players.get(hostId);
    const requester = this.players.get(request?.requesterId || '');

    if (!request || !host || !requester) {
      console.error('Invalid hosting request response');
      return;
    }

    if (accept) {
      // Start hosting session
      const sessionId = this.startHostingSession(hostId, request.requesterId, io);
      
      if (sessionId) {
        io.to(requester.socketId).emit('hosting-accepted', {
          hostId,
          hostName: host.name,
          sessionId
        });
        
        console.log(`Hosting request accepted: ${host.name} will host ${requester.name}`);
      } else {
        io.to(requester.socketId).emit('hosting-rejected', {
          hostId,
          reason: 'Failed to start hosting session'
        });
      }
    } else {
      io.to(requester.socketId).emit('hosting-rejected', {
        hostId,
        reason: reason || 'Request declined'
      });
      
      console.log(`Hosting request declined: ${host.name} declined ${requester.name}`);
    }

    // Remove the request
    this.hostingRequests.delete(requestId);
  }

  startHostingSession(hostId: string, guestId: string, io: any): string | null {
    const host = this.players.get(hostId);
    const guest = this.players.get(guestId);

    if (!host || !guest) {
      console.error('Invalid host or guest for hosting session');
      return null;
    }

    if (host.isHost || guest.isGuest) {
      console.error('Host is already hosting or guest is already in a session');
      return null;
    }

    // Create hosting session
    const session: HostingSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      hostId,
      guestId,
      startTime: Date.now(),
      active: true,
    };

    this.hostingSessions.set(session.id, session);

    // Update player states
    host.isHost = true;
    guest.isGuest = true;
    guest.hostId = hostId;

    // Remove host from available hosts
    this.availableHosts.delete(hostId);

    // Notify both players
    io.to(host.socketId).emit('hosting-session-started', {
      id: guest.id,
      name: guest.name,
      sessionId: session.id
    });

    io.to(guest.socketId).emit('hosting-session-started', {
      hostId,
      hostName: host.name,
      sessionId: session.id
    });

    // Broadcast updated host list
    this.broadcastAvailableHosts(io);

    console.log(`Hosting session started: ${host.name} hosting ${guest.name}`);
    return session.id;
  }

  endHostingSession(hostId: string, io?: any): void {
    const host = this.players.get(hostId);
    if (!host || !host.isHost) return;

    // Find the session
    let session: HostingSession | undefined;
    for (const [sessionId, s] of this.hostingSessions.entries()) {
      if (s.hostId === hostId && s.active) {
        session = s;
        break;
      }
    }

    if (!session) return;

    const guest = this.players.get(session.guestId);

    // Update player states
    host.isHost = false;
    if (guest) {
      guest.isGuest = false;
      guest.hostId = undefined;
    }

    // Deactivate session
    session.active = false;

    if (io) {
      // Notify both players
      io.to(host.socketId).emit('hosting-session-ended');
      if (guest) {
        io.to(guest.socketId).emit('hosting-session-ended');
      }

      // Broadcast updated host list
      this.broadcastAvailableHosts(io);
    }

    console.log(`Hosting session ended: ${host.name} ${guest ? `and ${guest.name}` : ''}`);
  }

  disconnectGuest(guestId: string, io?: any): void {
    const guest = this.players.get(guestId);
    if (!guest || !guest.isGuest || !guest.hostId) return;

    this.endHostingSession(guest.hostId, io);
  }

  getAvailableHosts(): Player[] {
    const hosts: Player[] = [];
    
    for (const hostId of this.availableHosts) {
      const host = this.players.get(hostId);
      if (host && host.hasGame && !host.isHost) {
        hosts.push(host);
      }
    }

    return hosts;
  }

  broadcastAvailableHosts(io: any): void {
    const availableHosts = this.getAvailableHosts();
    io.emit('hosts-updated', availableHosts);
  }

  getPlayerStats(): {
    totalPlayers: number;
    playersWithGame: number;
    playersWithoutGame: number;
    activeHosts: number;
    activeSessions: number;
  } {
    const players = Array.from(this.players.values());
    const activeSessions = Array.from(this.hostingSessions.values()).filter(s => s.active);

    return {
      totalPlayers: players.length,
      playersWithGame: players.filter(p => p.hasGame).length,
      playersWithoutGame: players.filter(p => !p.hasGame).length,
      activeHosts: players.filter(p => p.isHost).length,
      activeSessions: activeSessions.length,
    };
  }
}