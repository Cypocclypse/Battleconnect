import { app, BrowserWindow, ipcMain, desktopCapturer, shell } from 'electron';
import * as path from 'path';
import { GameDetector } from './GameDetector';
import { DesktopCapture } from './DesktopCapture';

class BattleconnectElectron {
  private mainWindow: BrowserWindow | null = null;
  private gameDetector: GameDetector;
  private desktopCapture: DesktopCapture;

  constructor() {
    this.gameDetector = new GameDetector();
    this.desktopCapture = new DesktopCapture();
    
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
  }

  private startGameDetection(): void {
    this.gameDetector.on('gameDetected', (detected: boolean, platform: string) => {
      this.mainWindow?.webContents.send('game-detected', detected, platform);
    });

    this.gameDetector.on('gameStatusChanged', (status: any) => {
      this.mainWindow?.webContents.send('game-status-changed', status);
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
}

// Initialize the application
new BattleconnectElectron();