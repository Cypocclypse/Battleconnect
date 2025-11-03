import { VoiceRoom } from '../types';

export class VoiceService {
  private rooms = new Map<string, VoiceRoom>();
  private participantRooms = new Map<string, Set<string>>(); // participantId -> roomIds

  joinRoom(participantId: string, roomId: string): VoiceRoom {
    // Get or create room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        participants: new Set(),
        createdAt: Date.now(),
      };
      this.rooms.set(roomId, room);
    }

    // Add participant to room
    room.participants.add(participantId);

    // Track participant's rooms
    if (!this.participantRooms.has(participantId)) {
      this.participantRooms.set(participantId, new Set());
    }
    this.participantRooms.get(participantId)!.add(roomId);

    console.log(`Participant ${participantId} joined voice room ${roomId}`);
    return room;
  }

  leaveRoom(participantId: string, roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !room.participants.has(participantId)) {
      return false;
    }

    // Remove participant from room
    room.participants.delete(participantId);

    // Remove room from participant's tracking
    const participantRooms = this.participantRooms.get(participantId);
    if (participantRooms) {
      participantRooms.delete(roomId);
      if (participantRooms.size === 0) {
        this.participantRooms.delete(participantId);
      }
    }

    // Clean up empty room
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
      console.log(`Voice room ${roomId} cleaned up (empty)`);
    }

    console.log(`Participant ${participantId} left voice room ${roomId}`);
    return true;
  }

  leaveAllRooms(participantId: string): string[] {
    const participantRooms = this.participantRooms.get(participantId);
    if (!participantRooms) {
      return [];
    }

    const roomIds = Array.from(participantRooms);
    
    // Remove participant from all rooms
    for (const roomId of roomIds) {
      this.leaveRoom(participantId, roomId);
    }

    return roomIds;
  }

  getRoom(roomId: string): VoiceRoom | undefined {
    return this.rooms.get(roomId);
  }

  getRoomParticipants(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.participants) : [];
  }

  isParticipantInRoom(participantId: string, roomId: string): boolean {
    const room = this.rooms.get(roomId);
    return room ? room.participants.has(participantId) : false;
  }

  getParticipantRooms(participantId: string): string[] {
    const rooms = this.participantRooms.get(participantId);
    return rooms ? Array.from(rooms) : [];
  }

  cleanupStaleRooms(maxAgeMs: number = 2 * 60 * 60 * 1000): number { // 2 hours default
    const now = Date.now();
    let cleanedCount = 0;

    for (const [roomId, room] of this.rooms.entries()) {
      if (now - room.createdAt > maxAgeMs) {
        // Clean up participant tracking for this room
        for (const participantId of room.participants) {
          const participantRooms = this.participantRooms.get(participantId);
          if (participantRooms) {
            participantRooms.delete(roomId);
            if (participantRooms.size === 0) {
              this.participantRooms.delete(participantId);
            }
          }
        }

        this.rooms.delete(roomId);
        cleanedCount++;
        console.log(`Cleaned up stale voice room: ${roomId}`);
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} stale voice rooms`);
    }

    return cleanedCount;
  }

  getStats(): {
    totalRooms: number;
    totalParticipants: number;
    averageParticipantsPerRoom: number;
  } {
    const totalRooms = this.rooms.size;
    const totalParticipants = this.participantRooms.size;
    
    let totalParticipantsInRooms = 0;
    for (const room of this.rooms.values()) {
      totalParticipantsInRooms += room.participants.size;
    }

    const averageParticipantsPerRoom = totalRooms > 0 
      ? totalParticipantsInRooms / totalRooms 
      : 0;

    return {
      totalRooms,
      totalParticipants,
      averageParticipantsPerRoom,
    };
  }
}