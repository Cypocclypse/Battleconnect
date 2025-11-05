// Extend the Window interface for Electron APIs
declare global {
  interface Window {
    electronAPI: {
      // Game detection
      startGameMonitoring: () => Promise<void>;
      stopGameMonitoring: () => Promise<void>;
      getGameStatus: () => Promise<any>;
      onGameDetected: (callback: (detected: boolean, platform: string) => void) => void;
      onGameStatusChanged: (callback: (status: any) => void) => void;

      // REVOLUTIONARY: Distributed Game Launcher
      launchDistributedGame: (data: any) => Promise<any>;
      autoLaunchGame: (sessionId: string, lobbySettings?: any) => Promise<any>;
      stopGame: (sessionId: string) => Promise<any>;
      getGameInstallations: () => Promise<any[]>;
      getActiveSessions: () => Promise<any[]>;
      
      // Gaming Profile Detection
      getGamingProfile: () => Promise<any>;
      getAllGamingProfiles: () => Promise<any[]>;
      setManualProfile: (username: string, platform?: string) => Promise<any>;
      onGamingProfilesDetected: (callback: (data: any) => void) => void;
      onGamingProfileUpdated: (callback: (profile: any) => void) => void;
      
      // Distributed game events
      onGameLaunched: (callback: (data: any) => void) => void;
      onInstanceRegistered: (callback: (data: any) => void) => void;
      onHostPromoted: (callback: (data: any) => void) => void;
      onReconnectionSuccess: (callback: (data: any) => void) => void;
      onInstanceCrashed: (callback: (data: any) => void) => void;
      onRequestHosting: (callback: (data: any) => void) => void;
      onGameReady: (callback: (data: any) => void) => void;
      onPlayerJoined: (callback: (data: any) => void) => void;

      // Desktop capture
      getDesktopSources: () => Promise<any[]>;
      startDesktopCapture: (sourceId: string) => Promise<void>;
      stopDesktopCapture: () => Promise<void>;

      // System integration
      launchGamePlatform: (platform: string) => Promise<void>;
      getSystemInfo: () => Promise<any>;

      // Input forwarding
      sendKeyboardInput: (keyEvent: any) => void;
      sendMouseInput: (mouseEvent: any) => void;

      // Utility
      removeAllListeners: (channel: string) => void;
    };
  }
}

export {};