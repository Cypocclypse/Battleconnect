/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    electronAPI?: {
      // Game detection
      startGameMonitoring: () => Promise<boolean>;
      stopGameMonitoring: () => Promise<boolean>;
      getGameStatus: () => Promise<any>;
      onGameDetected: (callback: (detected: boolean, platform: string) => void) => void;
      onGameStatusChanged: (callback: (status: any) => void) => void;
      
      // Desktop capture
      getDesktopSources: () => Promise<any[]>;
      startDesktopCapture: (sourceId: string) => Promise<boolean>;
      stopDesktopCapture: () => Promise<boolean>;
      
      // System integration
      launchGamePlatform: (platform: string) => Promise<boolean>;
      getSystemInfo: () => Promise<any>;
      
      // Input forwarding for game sharing
      sendKeyboardInput: (keyEvent: any) => void;
      sendMouseInput: (mouseEvent: any) => void;
      
      // Utility
      removeAllListeners: (channel: string) => void;
    };
  }
}