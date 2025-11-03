import { EventEmitter } from 'events';
import * as os from 'os';

export interface GameStatus {
  detected: boolean;
  running: boolean;
  platform: 'steam' | 'ea-app' | 'epic' | 'ps-remote' | 'unknown';
  processId?: number;
  windowTitle?: string;
}

export class GameDetector extends EventEmitter {
  private monitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private currentStatus: GameStatus = {
    detected: false,
    running: false,
    platform: 'unknown',
  };

  constructor() {
    super();
  }

  startMonitoring(): boolean {
    if (this.monitoring) {
      return true;
    }

    console.log('Starting game detection monitoring...');
    this.monitoring = true;
    
    // Check immediately
    this.checkForGame();
    
    // Then check every 2 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkForGame();
    }, 2000);

    return true;
  }

  stopMonitoring(): boolean {
    if (!this.monitoring) {
      return true;
    }

    console.log('Stopping game detection monitoring...');
    this.monitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    return true;
  }

  getCurrentStatus(): GameStatus {
    return { ...this.currentStatus };
  }

  private async checkForGame(): Promise<void> {
    try {
      const newStatus = await this.detectBattlefrontII();
      
      // Check if status changed
      if (this.hasStatusChanged(newStatus)) {
        const oldStatus = { ...this.currentStatus };
        this.currentStatus = newStatus;
        
        console.log('Game status changed:', newStatus);
        
        // Emit events
        this.emit('gameDetected', newStatus.detected, newStatus.platform);
        this.emit('gameStatusChanged', {
          previous: oldStatus,
          current: newStatus,
        });
      }
    } catch (error) {
      console.error('Error during game detection:', error);
    }
  }

  private async detectBattlefrontII(): Promise<GameStatus> {
    const platform = os.platform();
    
    if (platform === 'win32') {
      return this.detectOnWindows();
    } else if (platform === 'darwin') {
      return this.detectOnMacOS();
    } else {
      // Linux or other platforms
      return this.detectOnLinux();
    }
  }

  private async detectOnWindows(): Promise<GameStatus> {
    try {
      // Use Windows-specific detection methods
      const { exec } = require('child_process');
      
      return new Promise((resolve) => {
        // Check for Battlefront II processes
        exec('tasklist /FI "IMAGENAME eq starwarsbattlefrontii.exe"', (error: any, stdout: string) => {
          if (error) {
            resolve({
              detected: false,
              running: false,
              platform: 'unknown',
            });
            return;
          }

          const isRunning = stdout.includes('starwarsbattlefrontii.exe');
          
          if (isRunning) {
            // Try to determine platform
            let detectedPlatform: GameStatus['platform'] = 'unknown';
            
            // Check window titles to determine platform
            exec('tasklist /V /FI "IMAGENAME eq starwarsbattlefrontii.exe"', (titleError: any, titleStdout: string) => {
              if (!titleError && titleStdout) {
                if (titleStdout.includes('Steam')) {
                  detectedPlatform = 'steam';
                } else if (titleStdout.includes('Origin') || titleStdout.includes('EA')) {
                  detectedPlatform = 'ea-app';
                } else if (titleStdout.includes('Epic')) {
                  detectedPlatform = 'epic';
                }
              }
              
              resolve({
                detected: true,
                running: true,
                platform: detectedPlatform,
                windowTitle: 'Star Wars Battlefront II',
              });
            });
          } else {
            resolve({
              detected: false,
              running: false,
              platform: 'unknown',
            });
          }
        });
      });
    } catch (error) {
      console.error('Windows detection error:', error);
      return {
        detected: false,
        running: false,
        platform: 'unknown',
      };
    }
  }

  private async detectOnMacOS(): Promise<GameStatus> {
    try {
      const { exec } = require('child_process');
      
      return new Promise((resolve) => {
        // Check for Battlefront II on macOS (if available)
        exec('ps aux | grep -i "battlefront"', (error: any, stdout: string) => {
          if (error) {
            resolve({
              detected: false,
              running: false,
              platform: 'unknown',
            });
            return;
          }

          const isRunning = stdout.includes('battlefront') && !stdout.includes('grep');
          
          resolve({
            detected: isRunning,
            running: isRunning,
            platform: isRunning ? 'steam' : 'unknown', // Default to Steam on macOS
          });
        });
      });
    } catch (error) {
      console.error('macOS detection error:', error);
      return {
        detected: false,
        running: false,
        platform: 'unknown',
      };
    }
  }

  private async detectOnLinux(): Promise<GameStatus> {
    try {
      const { exec } = require('child_process');
      
      return new Promise((resolve) => {
        // Check for Battlefront II on Linux
        exec('pgrep -f battlefront', (error: any, stdout: string) => {
          if (error || !stdout.trim()) {
            resolve({
              detected: false,
              running: false,
              platform: 'unknown',
            });
            return;
          }

          resolve({
            detected: true,
            running: true,
            platform: 'steam', // Most likely Steam on Linux
          });
        });
      });
    } catch (error) {
      console.error('Linux detection error:', error);
      return {
        detected: false,
        running: false,
        platform: 'unknown',
      };
    }
  }

  private hasStatusChanged(newStatus: GameStatus): boolean {
    return (
      this.currentStatus.detected !== newStatus.detected ||
      this.currentStatus.running !== newStatus.running ||
      this.currentStatus.platform !== newStatus.platform
    );
  }

  // Manual game confirmation (fallback)
  confirmGameManually(platform: GameStatus['platform'] = 'unknown'): void {
    const newStatus: GameStatus = {
      detected: true,
      running: true,
      platform,
      windowTitle: 'Star Wars Battlefront II (Manual Confirmation)',
    };

    if (this.hasStatusChanged(newStatus)) {
      const oldStatus = { ...this.currentStatus };
      this.currentStatus = newStatus;
      
      console.log('Game manually confirmed:', newStatus);
      
      this.emit('gameDetected', true, platform);
      this.emit('gameStatusChanged', {
        previous: oldStatus,
        current: newStatus,
      });
    }
  }

  resetGameDetection(): void {
    const newStatus: GameStatus = {
      detected: false,
      running: false,
      platform: 'unknown',
    };

    if (this.hasStatusChanged(newStatus)) {
      const oldStatus = { ...this.currentStatus };
      this.currentStatus = newStatus;
      
      console.log('Game detection reset');
      
      this.emit('gameDetected', false, 'unknown');
      this.emit('gameStatusChanged', {
        previous: oldStatus,
        current: newStatus,
      });
    }
  }
}