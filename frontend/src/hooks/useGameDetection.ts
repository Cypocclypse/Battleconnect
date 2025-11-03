import { useState, useEffect } from 'react';
import { GameState } from '../types';

export function useGameDetection() {
  const [gameState, setGameState] = useState<GameState>({
    detected: false,
    running: false,
    platform: 'unknown',
  });
  
  const [manualConfirmation, setManualConfirmation] = useState(false);

  useEffect(() => {
    // Check if we're in Electron environment
    if (window.electronAPI) {
      // Use Electron's game detection
      window.electronAPI.onGameDetected((detected: boolean, platform: string) => {
        setGameState({
          detected,
          running: detected,
          platform: platform as GameState['platform'],
        });
      });

      // Start monitoring
      window.electronAPI.startGameMonitoring();
    } else {
      // Browser fallback - rely on manual confirmation
      console.log('Running in browser mode - manual game confirmation required');
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.stopGameMonitoring();
      }
    };
  }, []);

  const confirmGame = () => {
    setManualConfirmation(true);
    setGameState((prev: GameState) => ({
      ...prev,
      detected: true,
      running: true,
    }));
  };

  const resetGameDetection = () => {
    setManualConfirmation(false);
    setGameState({
      detected: false,
      running: false,
      platform: 'unknown',
    });
  };

  return {
    isGameRunning: gameState.running,
    gameDetected: gameState.detected,
    platform: gameState.platform,
    manualConfirmation,
    confirmGame,
    resetGameDetection,
  };
}

// Extend Window interface for Electron API
declare global {
  interface Window {
    electronAPI?: {
      onGameDetected: (callback: (detected: boolean, platform: string) => void) => void;
      startGameMonitoring: () => void;
      stopGameMonitoring: () => void;
    };
  }
}