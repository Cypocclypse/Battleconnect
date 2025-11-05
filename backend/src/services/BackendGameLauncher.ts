import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

interface GameInstallation {
  path: string;
  platform: 'steam' | 'ea-app' | 'epic';
  executable: string;
  valid: boolean;
}

interface LaunchResult {
  success: boolean;
  platform?: string;
  processId?: number;
  error?: string;
}

/**
 * REVOLUTIONARY: Backend Game Launcher for Browser Users
 * 
 * This allows people using Battleconnect in their browser to launch
 * Battlefront II on the server machine. The server acts as the host
 * and launches the actual game process.
 */
export class BackendGameLauncher extends EventEmitter {
  private installations: GameInstallation[] = [];
  private activeProcesses = new Map<string, ChildProcess>();

  constructor() {
    super();
    this.detectInstallations();
  }

  /**
   * Detect all available Battlefront II installations on the server
   */
  private async detectInstallations(): Promise<void> {
    console.log('🔍 BACKEND: Scanning for Battlefront II installations...');
    
    const possiblePaths = [
      // EA App / Origin
      'C:\\Program Files\\EA Games\\Star Wars Battlefront II',
      'C:\\Program Files (x86)\\EA Games\\Star Wars Battlefront II',
      'C:\\Program Files\\Origin Games\\Star Wars Battlefront II',
      'C:\\Program Files (x86)\\Origin Games\\Star Wars Battlefront II',
      
      // Steam
      'C:\\Program Files\\Steam\\steamapps\\common\\Star Wars Battlefront II',
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Star Wars Battlefront II',
      
      // Epic Games
      'C:\\Program Files\\Epic Games\\Star Wars Battlefront II',
      'C:\\Program Files (x86)\\Epic Games\\Star Wars Battlefront II'
    ];

    for (const basePath of possiblePaths) {
      try {
        const executable = `${basePath}\\starwarsbattlefrontii.exe`;
        
        // Check if executable exists
        const { stdout } = await execAsync(`if exist "${executable}" echo EXISTS`);
        
        if (stdout.includes('EXISTS')) {
          let platform: 'steam' | 'ea-app' | 'epic' = 'ea-app';
          
          if (basePath.includes('Steam')) platform = 'steam';
          else if (basePath.includes('Epic')) platform = 'epic';
          
          this.installations.push({
            path: basePath,
            platform,
            executable,
            valid: true
          });
          
          console.log(`✅ Found ${platform.toUpperCase()} installation: ${basePath}`);
        }
      } catch (error) {
        // Installation not found, continue
      }
    }

    console.log(`🎯 Backend found ${this.installations.length} Battlefront II installations`);
  }

  /**
   * Launch Battlefront II for browser users
   */
  async launchGameForBrowser(sessionId: string): Promise<LaunchResult> {
    console.log('🚀 BACKEND: Launching Battlefront II for browser user...');
    
    if (this.installations.length === 0) {
      return {
        success: false,
        error: 'No Battlefront II installations found on server'
      };
    }

    const installation = this.installations[0]; // Use first available
    
    try {
      let gameProcess: ChildProcess;
      
      switch (installation.platform) {
        case 'ea-app':
          // Launch via EA App protocol
          gameProcess = spawn('cmd', ['/c', 'start', '', 'origin2://game/launch?offerIds=1238061'], {
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore']
          });
          break;
          
        case 'steam':
          // Launch via Steam
          gameProcess = spawn('cmd', ['/c', 'start', '', 'steam://rungameid/1237950'], {
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore']
          });
          break;
          
        case 'epic':
          // Launch via Epic Games
          gameProcess = spawn('cmd', ['/c', 'start', '', 'com.epicgames.launcher://apps/Kiwi?action=launch&silent=true'], {
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore']
          });
          break;
          
        default:
          // Direct executable launch as fallback
          gameProcess = spawn(installation.executable, [], {
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore']
          });
      }

      this.activeProcesses.set(sessionId, gameProcess);
      
      console.log(`✅ BACKEND: Battlefront II launched via ${installation.platform} for session ${sessionId}`);
      
      // Emit success event
      this.emit('game-launched', {
        sessionId,
        platform: installation.platform,
        processId: gameProcess.pid
      });
      
      return {
        success: true,
        platform: installation.platform,
        processId: gameProcess.pid
      };
      
    } catch (error) {
      console.error('❌ BACKEND: Launch failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown launch error'
      };
    }
  }

  /**
   * Stop game for a session
   */
  async stopGame(sessionId: string): Promise<boolean> {
    const process = this.activeProcesses.get(sessionId);
    if (process) {
      process.kill();
      this.activeProcesses.delete(sessionId);
      console.log(`🛑 BACKEND: Stopped game for session ${sessionId}`);
      return true;
    }
    return false;
  }

  /**
   * Get available installations
   */
  getInstallations(): GameInstallation[] {
    return this.installations;
  }

  /**
   * Check if backend can launch games
   */
  canLaunchGames(): boolean {
    return this.installations.length > 0;
  }
}