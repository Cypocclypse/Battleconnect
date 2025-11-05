import { EventEmitter } from 'events';
import { exec, spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { GameDetector, GameInstallation } from './GameDetector';

const execAsync = promisify(exec);

interface LaunchResult {
  success: boolean;
  process?: ChildProcess;
  error?: string;
  platform: string;
}

interface GameSession {
  id: string;
  installation: GameInstallation;
  process?: ChildProcess;
  status: 'launching' | 'running' | 'crashed' | 'stopped';
  startTime: Date;
  lobbySettings?: any;
}

export class BattleconnectGameLauncher extends EventEmitter {
  private gameDetector: GameDetector;
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private launchAttempts: Map<string, number> = new Map();
  private gameSessions: Map<string, GameSession> = new Map();

  constructor() {
    super();
    this.gameDetector = new GameDetector();
    // Allow time for initial detection scan
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Wait for initial scan to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('🎯 GameLauncher initialized with installations:', this.gameDetector.getInstallations().length);
  }

  /**
   * REAL: Auto-detect and launch Battlefront II using actual game detection
   */
  async autoLaunchGame(sessionId: string, lobbySettings?: any): Promise<LaunchResult> {
    console.log('🚀 BATTLECONNECT: Starting automatic game launch...');
    
    try {
      // Get the best installation from our detector
      const installation = this.gameDetector.getBestInstallation();
      
      if (!installation || !installation.valid) {
        console.log('❌ No valid Battlefront II installation found');
        return {
          success: false,
          error: 'No valid Battlefront II installation detected',
          platform: 'unknown'
        };
      }

      console.log(`🎯 Using ${installation.platform.toUpperCase()} installation:`);
      console.log(`   📍 Path: ${installation.path}`);
      console.log(`   🎮 Executable: ${installation.executable}`);

      // Launch the game using the detected installation
      return await this.launchGameByPlatform(installation, sessionId, lobbySettings);
      
    } catch (error) {
      console.error('💥 Launch failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown launch error',
        platform: 'unknown'
      };
    }
  }

  private async launchGameByPlatform(installation: GameInstallation, sessionId: string, lobbySettings?: any): Promise<LaunchResult> {
    const attemptCount = this.launchAttempts.get(sessionId) || 0;
    this.launchAttempts.set(sessionId, attemptCount + 1);

    console.log(`🚀 Launching Battlefront II via ${installation.platform.toUpperCase()} (attempt ${attemptCount + 1})`);

    try {
      let gameProcess: ChildProcess;

      switch (installation.platform) {
        case 'steam':
          gameProcess = await this.launchViaSteam(installation, sessionId);
          break;
        case 'ea-app':
          gameProcess = await this.launchViaEAApp(installation, sessionId);
          break;
        case 'epic':
          gameProcess = await this.launchViaEpic(installation, sessionId);
          break;
        case 'ps-remote':
          return await this.launchViaPSRemotePlay(installation, sessionId);
        default:
          gameProcess = await this.launchDirectExecutable(installation, sessionId);
      }

      // Store the process for monitoring
      this.activeProcesses.set(sessionId, gameProcess);
      
      // Create session tracking
      const session: GameSession = {
        id: sessionId,
        installation,
        process: gameProcess,
        status: 'launching',
        startTime: new Date(),
        lobbySettings
      };
      this.gameSessions.set(sessionId, session);
      
      // Monitor the process
      this.monitorGameProcess(gameProcess, sessionId, installation.platform);

      console.log(`✅ Battlefront II launched successfully via ${installation.platform.toUpperCase()}`);
      
      return {
        success: true,
        process: gameProcess,
        platform: installation.platform
      };

    } catch (error) {
      console.error(`❌ Failed to launch via ${installation.platform}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Launch failed',
        platform: installation.platform
      };
    }
  }

  private async launchViaSteam(installation: GameInstallation, sessionId: string): Promise<ChildProcess> {
    console.log('🎮 Launching via Steam...');
    
    try {
      // Try Steam URI first (preferred method)
      const steamAppId = '1237950'; // Star Wars Battlefront II App ID
      const steamUrl = `steam://run/${steamAppId}`;
      
      console.log(`🔗 Using Steam URL: ${steamUrl}`);
      
      // Launch via Steam URL
      const process = spawn('cmd', ['/c', 'start', '', steamUrl], {
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore']
      });
      
      // Wait a moment for Steam to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify the game is starting by checking for the process
      const gameProcess = await this.findGameProcess();
      if (gameProcess) {
        console.log('✅ Steam launch successful - game process detected');
        return gameProcess;
      }
      
      // Fallback: Direct executable launch
      console.log('🔄 Steam URL failed, trying direct executable...');
      return await this.launchDirectExecutable(installation, sessionId);
      
    } catch (error) {
      console.error('❌ Steam launch failed:', error);
      throw new Error(`Steam launch failed: ${error}`);
    }
  }

  private async launchViaEAApp(installation: GameInstallation, sessionId: string): Promise<ChildProcess> {
    console.log('🛠️ Launching via EA App...');
    
    try {
      // Try EA App protocol first
      const eaAppUrl = 'origin2://game/launch?offerIds=1238061';
      
      console.log(`🔗 Using EA App URL: ${eaAppUrl}`);
      
      // Launch via EA App URL
      const process = spawn('cmd', ['/c', 'start', '', eaAppUrl], {
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore']
      });
      
      // Wait for EA App to process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if game is starting
      const gameProcess = await this.findGameProcess();
      if (gameProcess) {
        console.log('✅ EA App launch successful - game process detected');
        return gameProcess;
      }
      
      // Fallback: Direct executable launch
      console.log('🔄 EA App URL failed, trying direct executable...');
      return await this.launchDirectExecutable(installation, sessionId);
      
    } catch (error) {
      console.error('❌ EA App launch failed:', error);
      throw new Error(`EA App launch failed: ${error}`);
    }
  }

  private async launchViaEpic(installation: GameInstallation, sessionId: string): Promise<ChildProcess> {
    console.log('🎯 Launching via Epic Games...');
    
    try {
      // Epic Games Store uses com.epicgames.launcher://
      const epicUrl = 'com.epicgames.launcher://apps/71fd2eb8204945e2b6c5b1b84df28c2e?action=launch&silent=true';
      
      console.log(`🔗 Using Epic URL: ${epicUrl}`);
      
      const process = spawn('cmd', ['/c', 'start', '', epicUrl], {
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore']
      });
      
      // Wait for Epic to process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const gameProcess = await this.findGameProcess();
      if (gameProcess) {
        console.log('✅ Epic Games launch successful - game process detected');
        return gameProcess;
      }
      
      // Fallback: Direct executable
      console.log('🔄 Epic URL failed, trying direct executable...');
      return await this.launchDirectExecutable(installation, sessionId);
      
    } catch (error) {
      console.error('❌ Epic Games launch failed:', error);
      throw new Error(`Epic Games launch failed: ${error}`);
    }
  }

  private async launchViaPSRemotePlay(installation: GameInstallation, sessionId: string): Promise<LaunchResult> {
    console.log('🎮 Launching PlayStation Remote Play...');
    
    try {
      // Launch PS Remote Play application
      const process = spawn(installation.executable, [], {
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore']
      });
      
      console.log('✅ PlayStation Remote Play launched');
      console.log('📱 Please connect to your PS4/PS5 and launch Battlefront II on the console');
      
      return {
        success: true,
        process,
        platform: 'ps-remote'
      };
      
    } catch (error) {
      console.error('❌ PS Remote Play launch failed:', error);
      return {
        success: false,
        error: `PS Remote Play launch failed: ${error}`,
        platform: 'ps-remote'
      };
    }
  }

  private async launchDirectExecutable(installation: GameInstallation, sessionId: string): Promise<ChildProcess> {
    console.log('💿 Launching direct executable...');
    
    try {
      const gameProcess = spawn(installation.executable, [], {
        cwd: installation.path,
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore']
      });
      
      console.log(`✅ Direct executable launched: ${installation.executable}`);
      return gameProcess;
      
    } catch (error) {
      console.error('❌ Direct executable launch failed:', error);
      throw new Error(`Direct launch failed: ${error}`);
    }
  }

  private async findGameProcess(): Promise<ChildProcess | null> {
    try {
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq starwarsbattlefrontii.exe"');
      
      if (stdout.includes('starwarsbattlefrontii.exe')) {
        console.log('🎯 Battlefront II process detected');
        // Return a mock ChildProcess since we can't get the actual spawn reference
        return {} as ChildProcess;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private monitorGameProcess(process: ChildProcess, sessionId: string, platform: string): void {
    console.log(`👁️ Monitoring ${platform} game process for session ${sessionId}`);
    
    process.on('spawn', () => {
      console.log(`🎮 Game process spawned for ${platform}`);
      const session = this.gameSessions.get(sessionId);
      if (session) {
        session.status = 'running';
        this.emit('gameStarted', sessionId, platform);
      }
    });

    process.on('exit', (code, signal) => {
      console.log(`🔚 Game process exited: code=${code}, signal=${signal}`);
      const session = this.gameSessions.get(sessionId);
      if (session) {
        session.status = code === 0 ? 'stopped' : 'crashed';
      }
      
      this.activeProcesses.delete(sessionId);
      this.emit('gameExited', sessionId, code, signal);
    });

    process.on('error', (error) => {
      console.error(`💥 Game process error:`, error);
      const session = this.gameSessions.get(sessionId);
      if (session) {
        session.status = 'crashed';
      }
      
      this.emit('gameError', sessionId, error);
    });
  }

  /**
   * Stop a running game session
   */
  async stopGame(sessionId: string): Promise<boolean> {
    const process = this.activeProcesses.get(sessionId);
    const session = this.gameSessions.get(sessionId);
    
    if (!process || !session) {
      console.log(`❌ No active game session found for ${sessionId}`);
      return false;
    }

    try {
      console.log(`🛑 Stopping game session ${sessionId}`);
      
      // Try graceful shutdown first
      process.kill('SIGTERM');
      
      // Wait a moment for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Force kill if still running
      if (!process.killed) {
        process.kill('SIGKILL');
      }
      
      session.status = 'stopped';
      this.activeProcesses.delete(sessionId);
      this.emit('gameStopped', sessionId);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to stop game session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Get all active game sessions
   */
  getActiveSessions(): GameSession[] {
    return Array.from(this.gameSessions.values());
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): GameSession | undefined {
    return this.gameSessions.get(sessionId);
  }

  /**
   * Check if a game session is currently running
   */
  isGameRunning(sessionId: string): boolean {
    const session = this.gameSessions.get(sessionId);
    return session?.status === 'running' || session?.status === 'launching';
  }

  /**
   * Get available installations
   */
  getAvailableInstallations(): GameInstallation[] {
    return this.gameDetector.getInstallations();
  }

  /**
   * Refresh installation detection
   */
  async refreshInstallations(): Promise<GameInstallation[]> {
    return await this.gameDetector.scanForInstallations();
  }
}