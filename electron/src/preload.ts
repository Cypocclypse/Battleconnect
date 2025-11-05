import { contextBridge, ipcRenderer } from 'electron';

// Expose Electron APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Game detection
  startGameMonitoring: () => ipcRenderer.invoke('start-game-monitoring'),
  stopGameMonitoring: () => ipcRenderer.invoke('stop-game-monitoring'),
  getGameStatus: () => ipcRenderer.invoke('get-game-status'),
  onGameDetected: (callback: (detected: boolean, platform: string) => void) => {
    ipcRenderer.on('game-detected', (_, detected, platform) => callback(detected, platform));
  },
  onGameStatusChanged: (callback: (status: any) => void) => {
    ipcRenderer.on('game-status-changed', (_, status) => callback(status));
  },

  // REAL: Auto Game Launcher
  launchDistributedGame: (data: any) => ipcRenderer.invoke('launch-distributed-game', data),
  autoLaunchGame: (sessionId: string, lobbySettings?: any) => ipcRenderer.invoke('auto-launch-game', { sessionId, lobbySettings }),
  stopGame: (sessionId: string) => ipcRenderer.invoke('stop-game', sessionId),
  getGameInstallations: () => ipcRenderer.invoke('get-game-installations'),
  getActiveSessions: () => ipcRenderer.invoke('get-active-sessions'),
  
  // Distributed game events
  onGameLaunched: (callback: (data: any) => void) => {
    ipcRenderer.on('game-launched', (_, data) => callback(data));
  },
  onInstanceRegistered: (callback: (data: any) => void) => {
    ipcRenderer.on('instance-registered', (_, data) => callback(data));
  },
  onHostPromoted: (callback: (data: any) => void) => {
    ipcRenderer.on('host-promoted', (_, data) => callback(data));
  },
  onReconnectionSuccess: (callback: (data: any) => void) => {
    ipcRenderer.on('reconnection-success', (_, data) => callback(data));
  },
  onInstanceCrashed: (callback: (data: any) => void) => {
    ipcRenderer.on('instance-crashed', (_, data) => callback(data));
  },
  onRequestHosting: (callback: (data: any) => void) => {
    ipcRenderer.on('request-hosting', (_, data) => callback(data));
  },
  onGameReady: (callback: (data: any) => void) => {
    ipcRenderer.on('game-ready', (_, data) => callback(data));
  },
  onPlayerJoined: (callback: (data: any) => void) => {
    ipcRenderer.on('player-joined', (_, data) => callback(data));
  },

  // Desktop capture
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  startDesktopCapture: (sourceId: string) => ipcRenderer.invoke('start-desktop-capture', sourceId),
  stopDesktopCapture: () => ipcRenderer.invoke('stop-desktop-capture'),

  // System integration
  launchGamePlatform: (platform: string) => ipcRenderer.invoke('launch-game-platform', platform),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Input forwarding for game sharing
  sendKeyboardInput: (keyEvent: any) => ipcRenderer.send('send-keyboard-input', keyEvent),
  sendMouseInput: (mouseEvent: any) => ipcRenderer.send('send-mouse-input', mouseEvent),

  // Utility
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
});