import { EventEmitter } from 'events';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

export interface GameInstallation {
  path: string;
  platform: 'steam' | 'ea-app' | 'epic' | 'ps-remote' | 'unknown';
  executable: string;
  valid: boolean;
}

export interface GameStatus {
  detected: boolean;
  running: boolean;
  platform: 'steam' | 'ea-app' | 'epic' | 'ps-remote' | 'unknown';
  processId?: number;
  windowTitle?: string;
  installations: GameInstallation[];
}

export class GameDetector extends EventEmitter {
  private monitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private currentStatus: GameStatus = {
    detected: false,
    running: false,
    platform: 'unknown',
    installations: [],
  };
  private cachedInstallations: GameInstallation[] = [];

  constructor() {
    super();
    this.scanForInstallations();
  }

  async scanForInstallations(): Promise<GameInstallation[]> {
    console.log('Scanning for Battlefront II installations...');
    const installations: GameInstallation[] = [];
    const platform = os.platform();

    try {
      if (platform === 'win32') {
        installations.push(...await this.scanWindowsInstallations());
      } else if (platform === 'darwin') {
        installations.push(...await this.scanMacOSInstallations());
      } else {
        installations.push(...await this.scanLinuxInstallations());
      }

      this.cachedInstallations = installations;
      this.currentStatus.installations = installations;
      this.currentStatus.detected = installations.some(inst => inst.valid);

      console.log(`Found ${installations.length} Battlefront II installations:`, installations);
      this.emit('installationsFound', installations);
      
      return installations;
    } catch (error) {
      console.error('Error scanning for installations:', error);
      return [];
    }
  }

  private async scanWindowsInstallations(): Promise<GameInstallation[]> {
    const installations: GameInstallation[] = [];
    const possiblePaths = [
      // Steam paths - Default installations
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Star Wars Battlefront II',
      'C:\\Program Files\\Steam\\steamapps\\common\\Star Wars Battlefront II',
      'D:\\Steam\\steamapps\\common\\Star Wars Battlefront II',
      'E:\\Steam\\steamapps\\common\\Star Wars Battlefront II',
      'F:\\Steam\\steamapps\\common\\Star Wars Battlefront II',
      'G:\\Steam\\steamapps\\common\\Star Wars Battlefront II',
      
      // EA App / Origin paths
      'C:\\Program Files\\EA Games\\Star Wars Battlefront II',
      'C:\\Program Files (x86)\\EA Games\\Star Wars Battlefront II',
      'C:\\Program Files\\Origin Games\\Star Wars Battlefront II',
      'C:\\Program Files (x86)\\Origin Games\\Star Wars Battlefront II',
      
      // Epic Games paths
      'C:\\Program Files\\Epic Games\\Star Wars Battlefront II',
      'C:\\Program Files (x86)\\Epic Games\\Star Wars Battlefront II',
      'D:\\Epic Games\\Star Wars Battlefront II',
      'E:\\Epic Games\\Star Wars Battlefront II',
      
      // Microsoft Store / Xbox Game Pass paths
      'C:\\Program Files\\WindowsApps\\EA.StarWarsBattlefrontII_*',
      
      // PlayStation Remote Play - Check for PS Remote Play installations
      // We'll detect PS Remote Play as a platform but it connects to PS4/PS5
    ];

    // Also check Steam library folders
    try {
      const steamPaths = await this.getSteamLibraryPaths();
      for (const steamPath of steamPaths) {
        possiblePaths.push(path.join(steamPath, 'steamapps', 'common', 'Star Wars Battlefront II'));
      }
    } catch (error) {
      console.log('Could not scan Steam library paths:', error);
    }

    // Check for PlayStation Remote Play
    try {
      const psInstallations = await this.checkPlayStationRemotePlay();
      installations.push(...psInstallations);
    } catch (error) {
      console.log('Could not check PlayStation Remote Play:', error);
    }

    for (const installPath of possiblePaths) {
      try {
        if (fs.existsSync(installPath)) {
          const executable = path.join(installPath, 'starwarsbattlefrontii.exe');
          const valid = fs.existsSync(executable);
          
          let platform: GameInstallation['platform'] = 'unknown';
          if (installPath.includes('Steam') || installPath.includes('steamapps')) {
            platform = 'steam';
          } else if (installPath.includes('EA') || installPath.includes('Origin')) {
            platform = 'ea-app';
          } else if (installPath.includes('Epic')) {
            platform = 'epic';
          } else if (installPath.includes('WindowsApps')) {
            platform = 'unknown'; // Windows Store/Xbox Game Pass (could add separate type later)
          }

          installations.push({
            path: installPath,
            platform,
            executable,
            valid,
          });
        }
      } catch (error) {
        console.log(`Error checking path ${installPath}:`, error);
      }
    }

    return installations;
  }

  private async scanMacOSInstallations(): Promise<GameInstallation[]> {
    const installations: GameInstallation[] = [];
    const possiblePaths = [
      // Steam paths on macOS
      path.join(os.homedir(), 'Library', 'Application Support', 'Steam', 'steamapps', 'common', 'Star Wars Battlefront II'),
      '/Applications/Star Wars Battlefront II.app',
      
      // Other possible locations
      '/Applications/Games/Star Wars Battlefront II.app',
    ];

    for (const installPath of possiblePaths) {
      try {
        if (fs.existsSync(installPath)) {
          let executable = installPath;
          if (installPath.endsWith('.app')) {
            executable = path.join(installPath, 'Contents', 'MacOS', 'Star Wars Battlefront II');
          }
          
          const valid = fs.existsSync(executable);
          
          installations.push({
            path: installPath,
            platform: 'steam', // Most likely Steam on macOS
            executable,
            valid,
          });
        }
      } catch (error) {
        console.log(`Error checking path ${installPath}:`, error);
      }
    }

    return installations;
  }

  private async scanLinuxInstallations(): Promise<GameInstallation[]> {
    const installations: GameInstallation[] = [];
    const possiblePaths = [
      // Steam paths on Linux
      path.join(os.homedir(), '.steam', 'steam', 'steamapps', 'common', 'Star Wars Battlefront II'),
      path.join(os.homedir(), '.local', 'share', 'Steam', 'steamapps', 'common', 'Star Wars Battlefront II'),
      '/usr/games/Star Wars Battlefront II',
      '/opt/Star Wars Battlefront II',
    ];

    for (const installPath of possiblePaths) {
      try {
        if (fs.existsSync(installPath)) {
          const executable = path.join(installPath, 'starwarsbattlefrontii');
          const valid = fs.existsSync(executable);
          
          installations.push({
            path: installPath,
            platform: 'steam', // Most likely Steam on Linux
            executable,
            valid,
          });
        }
      } catch (error) {
        console.log(`Error checking path ${installPath}:`, error);
      }
    }

    return installations;
  }

  private async getSteamLibraryPaths(): Promise<string[]> {
    const paths: string[] = [];
    
    try {
      // Check multiple possible Steam installation locations
      const possibleSteamPaths = [
        'C:\\Program Files (x86)\\Steam',
        'C:\\Program Files\\Steam',
        'D:\\Steam',
        'E:\\Steam',
        'F:\\Steam',
        path.join(os.homedir(), 'Steam'), // Portable Steam installs
      ];
      
      for (const steamPath of possibleSteamPaths) {
        const configPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
        
        if (fs.existsSync(configPath)) {
          console.log(`Found Steam config at: ${configPath}`);
          const content = fs.readFileSync(configPath, 'utf8');
          
          // Parse VDF format for library paths
          const pathMatches = content.match(/"path"\s+"([^"]+)"/g);
          
          if (pathMatches) {
            for (const match of pathMatches) {
              const pathMatch = match.match(/"path"\s+"([^"]+)"/);
              if (pathMatch) {
                const libraryPath = pathMatch[1].replace(/\\\\/g, '\\');
                if (!paths.includes(libraryPath)) {
                  paths.push(libraryPath);
                  console.log(`Added Steam library: ${libraryPath}`);
                }
              }
            }
          }
        }
      }
      
      // Also check registry for Steam installation path (Windows specific)
      if (os.platform() === 'win32') {
        try {
          const { exec } = require('child_process');
          await new Promise<void>((resolve) => {
            exec('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v InstallPath', (error, stdout) => {
              if (!error && stdout) {
                const match = stdout.match(/InstallPath\s+REG_SZ\s+(.+)/);
                if (match) {
                  const registryPath = match[1].trim();
                  if (fs.existsSync(registryPath) && !paths.some(p => p.includes(registryPath))) {
                    paths.push(registryPath);
                    console.log(`Added Steam from registry: ${registryPath}`);
                  }
                }
              }
              resolve();
            });
          });
        } catch (regError) {
          console.log('Could not check Steam registry:', regError);
        }
      }
      
    } catch (error) {
      console.log('Error reading Steam library paths:', error);
    }

    return paths;
  }

  private async checkPlayStationRemotePlay(): Promise<GameInstallation[]> {
    const installations: GameInstallation[] = [];
    
    try {
      // Check for PlayStation Remote Play installation
      const psRemotePaths = [
        'C:\\Program Files (x86)\\Sony\\PS Remote Play\\RemotePlay.exe',
        'C:\\Program Files\\Sony\\PS Remote Play\\RemotePlay.exe',
        path.join(os.homedir(), 'AppData', 'Local', 'Sony', 'PS Remote Play', 'RemotePlay.exe'),
      ];
      
      for (const psPath of psRemotePaths) {
        if (fs.existsSync(psPath)) {
          console.log(`Found PS Remote Play at: ${psPath}`);
          installations.push({
            path: path.dirname(psPath),
            platform: 'ps-remote',
            executable: psPath,
            valid: true,
          });
          break; // Only need one PS Remote Play installation
        }
      }
      
      // If PS Remote Play is found, it means Battlefront II could be played via PS4/PS5
      if (installations.length > 0) {
        console.log('PlayStation Remote Play detected - Battlefront II can be played via PS4/PS5');
      }
      
    } catch (error) {
      console.log('Error checking PlayStation Remote Play:', error);
    }
    
    return installations;
  }

  getInstallations(): GameInstallation[] {
    return [...this.cachedInstallations];
  }

  getBestInstallation(): GameInstallation | null {
    const validInstallations = this.cachedInstallations.filter(inst => inst.valid);
    if (validInstallations.length === 0) return null;

    // Prefer Steam (most features), then EA App (official), then Epic, then PS Remote Play, then others
    const priority = ['steam', 'ea-app', 'epic', 'ps-remote', 'unknown'];
    for (const platform of priority) {
      const installation = validInstallations.find(inst => inst.platform === platform);
      if (installation) return installation;
    }

    return validInstallations[0];
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
              detected: this.cachedInstallations.some(inst => inst.valid),
              running: false,
              platform: 'unknown',
              installations: this.cachedInstallations,
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
                installations: this.cachedInstallations,
              });
            });
          } else {
            resolve({
              detected: this.cachedInstallations.some(inst => inst.valid),
              running: false,
              platform: 'unknown',
              installations: this.cachedInstallations,
            });
          }
        });
      });
    } catch (error) {
      console.error('Windows detection error:', error);
      return {
        detected: this.cachedInstallations.some(inst => inst.valid),
        running: false,
        platform: 'unknown',
        installations: this.cachedInstallations,
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
              detected: this.cachedInstallations.some(inst => inst.valid),
              running: false,
              platform: 'unknown',
              installations: this.cachedInstallations,
            });
            return;
          }

          const isRunning = stdout.includes('battlefront') && !stdout.includes('grep');
          
          resolve({
            detected: this.cachedInstallations.some(inst => inst.valid),
            running: isRunning,
            platform: isRunning ? 'steam' : 'unknown',
            installations: this.cachedInstallations,
          });
        });
      });
    } catch (error) {
      console.error('macOS detection error:', error);
      return {
        detected: this.cachedInstallations.some(inst => inst.valid),
        running: false,
        platform: 'unknown',
        installations: this.cachedInstallations,
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
              detected: this.cachedInstallations.some(inst => inst.valid),
              running: false,
              platform: 'unknown',
              installations: this.cachedInstallations,
            });
            return;
          }

          resolve({
            detected: this.cachedInstallations.some(inst => inst.valid),
            running: true,
            platform: 'steam',
            installations: this.cachedInstallations,
          });
        });
      });
    } catch (error) {
      console.error('Linux detection error:', error);
      return {
        detected: this.cachedInstallations.some(inst => inst.valid),
        running: false,
        platform: 'unknown',
        installations: this.cachedInstallations,
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
      installations: this.cachedInstallations,
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
      detected: this.cachedInstallations.some(inst => inst.valid),
      running: false,
      platform: 'unknown',
      installations: this.cachedInstallations,
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