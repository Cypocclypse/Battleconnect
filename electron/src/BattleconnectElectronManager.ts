import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { BattleconnectGameLauncher } from './GameLauncher';

class BattleconnectElectronManager {
  private mainWindow: BrowserWindow | null = null;
  private gameLauncher: BattleconnectGameLauncher;

  constructor() {
    this.gameLauncher = new BattleconnectGameLauncher();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for game launcher events and forward to frontend
    this.gameLauncher.on('game-launched', (data) => {
      this.sendToRenderer('game-launched', data);
    });

    this.gameLauncher.on('instance-registered', (data) => {
      this.sendToRenderer('instance-registered', data);
    });

    this.gameLauncher.on('host-promoted', (data) => {
      this.sendToRenderer('host-promoted', data);
    });

    this.gameLauncher.on('reconnection-success', (data) => {
      this.sendToRenderer('reconnection-success', data);
    });

    this.gameLauncher.on('instance-crashed', (data) => {
      this.sendToRenderer('instance-crashed', data);
    });

    this.gameLauncher.on('request-hosting', (data) => {
      this.sendToRenderer('request-hosting', data);
    });

    this.gameLauncher.on('game-ready', (data) => {
      this.sendToRenderer('game-ready', data);
    });

    this.gameLauncher.on('player-joined', (data) => {
      this.sendToRenderer('player-joined', data);
    });
  }

  private sendToRenderer(event: string, data: any) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send(event, data);
    }
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;

    // Setup IPC handlers for frontend communication
    ipcMain.handle('launch-distributed-game', async (_, data) => {
      const { sessionId, gameSettings, autoDetect, fallbackToHosting } = data;
      
      console.log('🚀 ELECTRON: Received launch request from frontend');
      
      const result = await this.gameLauncher.autoLaunchGame(sessionId, gameSettings);
      return result.success ? 'launched' : 'requesting_host';
    });

    ipcMain.handle('force-reconnection', async (_, data) => {
      const { sessionId, instanceId } = data;
      
      console.log('🔄 ELECTRON: Force reconnection request');
      // Implementation would trigger reconnection attempt
      return { success: true };
    });

    ipcMain.handle('auto-launch-game', async (_, data) => {
      const { sessionId, lobbySettings } = data;
      console.log('🚀 ELECTRON: Auto-launching game');
      return await this.gameLauncher.autoLaunchGame(sessionId, lobbySettings);
    });

    ipcMain.handle('stop-game', async (_, sessionId) => {
      console.log('🛑 ELECTRON: Stopping game');
      return await this.gameLauncher.stopGame(sessionId);
    });

    ipcMain.handle('get-game-installations', async () => {
      console.log('🔍 ELECTRON: Getting game installations');
      return this.gameLauncher.getAvailableInstallations();
    });

    ipcMain.handle('get-active-sessions', async () => {
      console.log('📊 ELECTRON: Getting active sessions');
      return this.gameLauncher.getActiveSessions();
    });
  }
}

const electronManager = new BattleconnectElectronManager();

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Battleconnect - Revolutionary Multiplayer Shell',
    icon: path.join(__dirname, '../../assets/battleconnect-icon.png'), // Optional icon
    show: false, // Don't show until ready
  });

  electronManager.setMainWindow(mainWindow);

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../frontend/dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Auto-focus window on startup
    if (mainWindow) {
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    app.quit();
  });

  return mainWindow;
};

// App event listeners
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app termination
app.on('before-quit', () => {
  console.log('🛑 Battleconnect shutting down...');
  // Cleanup would happen here
});

export { electronManager };