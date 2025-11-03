import { SyncEvent } from '../types';

export class SyncService {
  private events = new Map<string, SyncEvent[]>(); // lobbyId -> events
  private countdowns = new Map<string, NodeJS.Timeout>(); // lobbyId -> timeout

  createSyncEvent(
    type: SyncEvent['type'],
    payload: any,
    lobbyId: string
  ): SyncEvent {
    const event: SyncEvent = {
      type,
      payload,
      timestamp: Date.now(),
      lobbyId,
    };

    // Store event in lobby history
    if (!this.events.has(lobbyId)) {
      this.events.set(lobbyId, []);
    }
    
    const lobbyEvents = this.events.get(lobbyId)!;
    lobbyEvents.push(event);

    // Keep only last 20 events per lobby
    if (lobbyEvents.length > 20) {
      lobbyEvents.splice(0, lobbyEvents.length - 20);
    }

    console.log(`Sync event created for lobby ${lobbyId}: ${type}`);
    return event;
  }

  startMatchCountdown(
    lobbyId: string,
    onTick: (seconds: number) => void,
    onComplete: () => void,
    duration: number = 10
  ): void {
    // Clear any existing countdown for this lobby
    this.clearCountdown(lobbyId);

    let remainingSeconds = duration;
    
    // Emit initial countdown
    onTick(remainingSeconds);
    
    // Create countdown event
    this.createSyncEvent('countdown', { seconds: remainingSeconds }, lobbyId);

    const countdownInterval = setInterval(() => {
      remainingSeconds--;
      
      if (remainingSeconds > 0) {
        onTick(remainingSeconds);
        this.createSyncEvent('countdown', { seconds: remainingSeconds }, lobbyId);
      } else {
        // Countdown finished
        clearInterval(countdownInterval);
        this.countdowns.delete(lobbyId);
        
        onTick(0);
        onComplete();
        
        console.log(`Match countdown completed for lobby ${lobbyId}`);
      }
    }, 1000);

    // Store the interval reference
    this.countdowns.set(lobbyId, countdownInterval);
    
    console.log(`Match countdown started for lobby ${lobbyId}: ${duration} seconds`);
  }

  clearCountdown(lobbyId: string): boolean {
    const existingCountdown = this.countdowns.get(lobbyId);
    if (existingCountdown) {
      clearInterval(existingCountdown);
      this.countdowns.delete(lobbyId);
      console.log(`Cleared countdown for lobby ${lobbyId}`);
      return true;
    }
    return false;
  }

  endMatch(lobbyId: string): SyncEvent {
    // Clear any active countdown
    this.clearCountdown(lobbyId);
    
    // Create match end event
    const event = this.createSyncEvent('match-end', { lobbyId }, lobbyId);
    
    console.log(`Match ended for lobby ${lobbyId}`);
    return event;
  }

  assignTeams(
    lobbyId: string,
    teamAssignments: { lightSide: string[]; darkSide: string[] }
  ): SyncEvent {
    const event = this.createSyncEvent('team-assignment', teamAssignments, lobbyId);
    
    console.log(`Teams assigned for lobby ${lobbyId}`);
    return event;
  }

  getEvents(lobbyId: string): SyncEvent[] {
    return this.events.get(lobbyId) || [];
  }

  getRecentEvents(lobbyId: string, count: number = 10): SyncEvent[] {
    const allEvents = this.getEvents(lobbyId);
    return allEvents.slice(-count);
  }

  isCountdownActive(lobbyId: string): boolean {
    return this.countdowns.has(lobbyId);
  }

  clearLobbyEvents(lobbyId: string): void {
    this.events.delete(lobbyId);
    this.clearCountdown(lobbyId);
    console.log(`Cleared all events for lobby ${lobbyId}`);
  }

  cleanupOldEvents(maxAgeMs: number = 24 * 60 * 60 * 1000): number { // 24 hours default
    const now = Date.now();
    let cleanedCount = 0;

    for (const [lobbyId, events] of this.events.entries()) {
      const initialLength = events.length;
      const filteredEvents = events.filter(event => now - event.timestamp <= maxAgeMs);
      
      if (filteredEvents.length === 0) {
        this.events.delete(lobbyId);
      } else {
        this.events.set(lobbyId, filteredEvents);
      }
      
      cleanedCount += initialLength - filteredEvents.length;
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old sync events`);
    }

    return cleanedCount;
  }

  // Interpolation for synchronized actions (future enhancement)
  createInterpolatedEvent(
    type: SyncEvent['type'],
    payload: any,
    lobbyId: string,
    delayMs: number
  ): SyncEvent {
    const targetTimestamp = Date.now() + delayMs;
    
    const event: SyncEvent = {
      type,
      payload: {
        ...payload,
        scheduledFor: targetTimestamp,
        interpolated: true,
      },
      timestamp: targetTimestamp,
      lobbyId,
    };

    // Store event
    if (!this.events.has(lobbyId)) {
      this.events.set(lobbyId, []);
    }
    this.events.get(lobbyId)!.push(event);

    console.log(`Interpolated sync event created for lobby ${lobbyId}: ${type} (delay: ${delayMs}ms)`);
    return event;
  }

  getStats(): {
    totalEvents: number;
    activeCountdowns: number;
    lobbiesWithEvents: number;
  } {
    let totalEvents = 0;
    for (const events of this.events.values()) {
      totalEvents += events.length;
    }

    return {
      totalEvents,
      activeCountdowns: this.countdowns.size,
      lobbiesWithEvents: this.events.size,
    };
  }
}