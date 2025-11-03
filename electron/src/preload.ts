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

  // Desktop capture
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  startDesktopCapture: (sourceId: string) => ipcRenderer.invoke('start-desktop-capture', sourceId),
  stopDesktopCapture: () => ipcRenderer.invoke('stop-desktop-capture'),

  // System integration
  launchGamePlatform: (platform: string) => ipcRenderer.invoke('launch-game-platform', platform),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Utility
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
});