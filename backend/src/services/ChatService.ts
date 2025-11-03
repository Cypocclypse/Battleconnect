import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ServerConfig } from '../types';

export class ChatService {
  private globalHistory: ChatMessage[] = [];
  private lobbyHistory = new Map<string, ChatMessage[]>();

  constructor(private config: ServerConfig) {}

  addUserMessage(
    userId: string,
    username: string,
    message: string,
    lobbyId?: string
  ): ChatMessage {
    const chatMessage: ChatMessage = {
      id: uuidv4(),
      userId,
      username,
      message,
      timestamp: Date.now(),
      type: 'user',
      lobbyId,
    };

    if (lobbyId) {
      // Add to lobby-specific history
      if (!this.lobbyHistory.has(lobbyId)) {
        this.lobbyHistory.set(lobbyId, []);
      }
      const lobbyMessages = this.lobbyHistory.get(lobbyId)!;
      lobbyMessages.push(chatMessage);
      
      // Limit history size
      if (lobbyMessages.length > this.config.chat.maxHistorySize) {
        lobbyMessages.splice(0, lobbyMessages.length - this.config.chat.maxHistorySize);
      }
    } else {
      // Add to global history
      this.globalHistory.push(chatMessage);
      
      // Limit history size
      if (this.globalHistory.length > this.config.chat.maxHistorySize) {
        this.globalHistory.splice(0, this.globalHistory.length - this.config.chat.maxHistorySize);
      }
    }

    console.log(`Chat message from ${username}: ${message}`);
    return chatMessage;
  }

  addSystemMessage(message: string, lobbyId?: string): ChatMessage {
    const chatMessage: ChatMessage = {
      id: uuidv4(),
      userId: 'system',
      username: 'System',
      message,
      timestamp: Date.now(),
      type: 'system',
      lobbyId,
    };

    if (lobbyId) {
      // Add to lobby-specific history
      if (!this.lobbyHistory.has(lobbyId)) {
        this.lobbyHistory.set(lobbyId, []);
      }
      const lobbyMessages = this.lobbyHistory.get(lobbyId)!;
      lobbyMessages.push(chatMessage);
      
      // Limit history size
      if (lobbyMessages.length > this.config.chat.maxHistorySize) {
        lobbyMessages.splice(0, lobbyMessages.length - this.config.chat.maxHistorySize);
      }
    } else {
      // Add to global history
      this.globalHistory.push(chatMessage);
      
      // Limit history size
      if (this.globalHistory.length > this.config.chat.maxHistorySize) {
        this.globalHistory.splice(0, this.globalHistory.length - this.config.chat.maxHistorySize);
      }
    }

    return chatMessage;
  }

  getHistory(lobbyId?: string): ChatMessage[] {
    if (lobbyId) {
      return this.lobbyHistory.get(lobbyId) || [];
    }
    return this.globalHistory;
  }

  cleanupOldMessages(): number {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;

    // Clean global history
    const initialGlobalLength = this.globalHistory.length;
    this.globalHistory = this.globalHistory.filter(msg => now - msg.timestamp <= maxAge);
    cleaned += initialGlobalLength - this.globalHistory.length;

    // Clean lobby histories
    for (const [lobbyId, messages] of this.lobbyHistory.entries()) {
      const initialLength = messages.length;
      const filtered = messages.filter(msg => now - msg.timestamp <= maxAge);
      
      if (filtered.length === 0) {
        this.lobbyHistory.delete(lobbyId);
      } else {
        this.lobbyHistory.set(lobbyId, filtered);
      }
      
      cleaned += initialLength - filtered.length;
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old chat messages`);
    }

    return cleaned;
  }

  clearLobbyHistory(lobbyId: string): void {
    this.lobbyHistory.delete(lobbyId);
  }
}