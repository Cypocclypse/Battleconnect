import { app, BrowserWindow, ipcMain, desktopCapturer, shell } from 'electron';
import * as path from 'path';
import { GameDetector } from './GameDetector';
import { DesktopCapture } from './DesktopCapture';
import { BattleconnectGameLauncher } from './GameLauncher';

class BattleconnectElectron {
  private mainWindow: BrowserWindow | null = null;
  private gameDetector: GameDetector;
  private desktopCapture: DesktopCapture;
  private gameLauncher: BattleconnectGameLauncher;

  constructor() {
    this.gameDetector = new GameDetector();
    this.desktopCapture = new DesktopCapture();
    this.gameLauncher = new BattleconnectGameLauncher();
    
    this.initializeApp();
  }

  private initializeApp(): void {
    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupIPC();
      this.startGameDetection();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'hiddenInset',
      fullscreenable: true,
      show: false, // Show after ready
    });

    // Load the frontend
    const isDev = process.env.NODE_ENV === 'development';
    const frontendUrl = isDev 
      ? 'http://localhost:3000' 
      : `file://${path.join(__dirname, '../frontend/dist/index.html')}`;

    this.mainWindow.loadURL(frontendUrl);

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Development tools
    if (isDev) {
      this.mainWindow.webContents.openDevTools();
    }
  }

  private setupIPC(): void {
    // Game detection IPC
    ipcMain.handle('start-game-monitoring', () => {
      return this.gameDetector.startMonitoring();
    });

    ipcMain.handle('stop-game-monitoring', () => {
      return this.gameDetector.stopMonitoring();
    });

    ipcMain.handle('get-game-status', () => {
      return this.gameDetector.getCurrentStatus();
    });

    // REVOLUTIONARY: Distributed Game Launch IPC
    ipcMain.handle('launch-distributed-game', async (_, data) => {
      console.log('🚀 ELECTRON: Launching distributed game:', data);
      return this.gameLauncher.autoLaunchGame(data.sessionId, data.gameSettings);
    });

    ipcMain.handle('auto-launch-game', async (_, { sessionId, lobbySettings }) => {
      console.log('🎯 ELECTRON: Auto-launching game for session:', sessionId);
      return this.gameLauncher.autoLaunchGame(sessionId, lobbySettings);
    });

    ipcMain.handle('stop-game', async (_, sessionId) => {
      return this.gameLauncher.stopGame(sessionId);
    });

    ipcMain.handle('get-game-installations', () => {
      return this.gameDetector.getInstallations();
    });

    ipcMain.handle('get-active-sessions', () => {
      return this.gameLauncher.getActiveSessions();
    });

    // Desktop capture IPC
    ipcMain.handle('get-desktop-sources', async () => {
      return this.desktopCapture.getSources();
    });

    ipcMain.handle('start-desktop-capture', async (_, sourceId: string) => {
      return this.desktopCapture.startCapture(sourceId);
    });

    ipcMain.handle('stop-desktop-capture', () => {
      return this.desktopCapture.stopCapture();
    });

    // System integration
    ipcMain.handle('launch-game-platform', async (_, platform: string) => {
      return this.launchGamePlatform(platform);
    });

    ipcMain.handle('get-system-info', () => {
      return {
        platform: process.platform,
        arch: process.arch,
        version: app.getVersion(),
        electron: process.versions.electron,
      };
    });

    // Input forwarding for game sharing
    ipcMain.on('send-keyboard-input', (_, keyEvent) => {
      this.forwardKeyboardInput(keyEvent);
    });

    ipcMain.on('send-mouse-input', (_, mouseEvent) => {
      this.forwardMouseInput(mouseEvent);
    });
  }

  private startGameDetection(): void {
    this.gameDetector.on('gameDetected', (detected: boolean, platform: string) => {
      this.mainWindow?.webContents.send('game-detected', detected, platform);
    });

    this.gameDetector.on('gameStatusChanged', (status: any) => {
      this.mainWindow?.webContents.send('game-status-changed', status);
    });

    // Revolutionary game launcher events
    this.gameLauncher.on('gameLaunched', (data: any) => {
      this.mainWindow?.webContents.send('game-launched', data);
    });

    this.gameLauncher.on('instanceRegistered', (data: any) => {
      this.mainWindow?.webContents.send('instance-registered', data);
    });

    this.gameLauncher.on('hostPromoted', (data: any) => {
      this.mainWindow?.webContents.send('host-promoted', data);
    });

    this.gameLauncher.on('reconnectionSuccess', (data: any) => {
      this.mainWindow?.webContents.send('reconnection-success', data);
    });

    this.gameLauncher.on('instanceCrashed', (data: any) => {
      this.mainWindow?.webContents.send('instance-crashed', data);
    });
  }

  private async launchGamePlatform(platform: string): Promise<boolean> {
    try {
      switch (platform.toLowerCase()) {
        case 'steam':
          await shell.openExternal('steam://rungameid/1237950'); // Battlefront II Steam ID
          break;
        case 'ea-app':
        case 'origin':
          await shell.openExternal('origin2://game/launch?offerIds=1034927');
          break;
        case 'epic':
          await shell.openExternal('com.epicgames.launcher://apps/Kiwi?action=launch&silent=true');
          break;
        default:
          return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to launch game platform:', error);
      return false;
    }
  }

  private forwardKeyboardInput(keyEvent: any): void {
    // This is a complex feature that would require native OS integration
    // For Windows, this would use Windows API calls
    // For macOS, this would use Core Graphics or other native APIs
    // For Linux, this would use X11 or other display server APIs
    
    console.log('Forwarding keyboard input:', keyEvent);
    
    // Implementation would depend on the platform
    if (process.platform === 'win32') {
      // Use Windows API to send input to the Battlefront II window
      // This would require additional native modules or libraries
      this.sendWindowsKeyInput(keyEvent);
    } else if (process.platform === 'darwin') {
      // Use macOS APIs for input forwarding
      this.sendMacOSKeyInput(keyEvent);
    } else if (process.platform === 'linux') {
      // Use Linux X11 or Wayland for input forwarding
      this.sendLinuxKeyInput(keyEvent);
    }
  }

  private forwardMouseInput(mouseEvent: any): void {
    console.log('Forwarding mouse input:', mouseEvent);
    
    if (process.platform === 'win32') {
      this.sendWindowsMouseInput(mouseEvent);
    } else if (process.platform === 'darwin') {
      this.sendMacOSMouseInput(mouseEvent);
    } else if (process.platform === 'linux') {
      this.sendLinuxMouseInput(mouseEvent);
    }
  }

  // Platform-specific input forwarding implementations
  private sendWindowsKeyInput(keyEvent: any): void {
    // This would require native Windows API integration
    // For demonstration, we're logging what would be implemented
    console.log('Windows key input forwarding (requires native implementation):', keyEvent);
    
    // Example of what this would involve:
    // - Find the Battlefront II window handle
    // - Use SendMessage or PostMessage to send WM_KEYDOWN/WM_KEYUP messages
    // - Handle special keys, modifiers, and key combinations
  }

  private sendWindowsMouseInput(mouseEvent: any): void {
    console.log('Windows mouse input forwarding (requires native implementation):', mouseEvent);
    
    // Example implementation:
    // - Convert screen coordinates to window coordinates
    // - Send WM_MOUSEMOVE, WM_LBUTTONDOWN, WM_LBUTTONUP, etc.
    // - Handle different mouse buttons and wheel events
  }

  private sendMacOSKeyInput(keyEvent: any): void {
    console.log('macOS key input forwarding (requires native implementation):', keyEvent);
    
    // Would use Core Graphics or other macOS frameworks
    // CGEventCreateKeyboardEvent, CGEventPost, etc.
  }

  private sendMacOSMouseInput(mouseEvent: any): void {
    console.log('macOS mouse input forwarding (requires native implementation):', mouseEvent);
    
    // Would use CGEventCreateMouseEvent, CGEventPost, etc.
  }

  private sendLinuxKeyInput(keyEvent: any): void {
    console.log('Linux key input forwarding (requires native implementation):', keyEvent);
    
    // Would use X11 XTest extension or similar
    // XTestFakeKeyEvent, XTestFakeButtonEvent, etc.
  }

  private sendLinuxMouseInput(mouseEvent: any): void {
    console.log('Linux mouse input forwarding (requires native implementation):', mouseEvent);
    
    // Would use X11 XTest extension for mouse simulation
  }
}

// Initialize the application
new BattleconnectElectron();