import { useState, useEffect } from 'react';
import { GameDetection } from './components/GameDetection';
import { LobbyManager } from './components/LobbyManager';
import { VoiceChat } from './components/VoiceChat';
import { PersistentChat } from './components/PersistentChat';
import { GameSyncPanel } from './components/GameSyncPanel';
import { InstructionsDropdown } from './components/InstructionsDropdown';
import { GameHosting } from './components/GameHosting';
import { useWebSocket } from './hooks/useWebSocket';
import { useGameDetection } from './hooks/useGameDetection';

function App() {
  const [gameDetected, setGameDetected] = useState(false);
  const [inLobby, setInLobby] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [playerName, setPlayerName] = useState(
    localStorage.getItem('battleconnect-player-name') || `Player_${Math.random().toString(36).substr(2, 6)}`
  );
  const [playerId] = useState(
    localStorage.getItem('battleconnect-player-id') || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  const { socket, connected } = useWebSocket();
  const { isGameRunning, manualConfirmation, confirmGame } = useGameDetection();

  useEffect(() => {
    if (isGameRunning || manualConfirmation) {
      setGameDetected(true);
    }
  }, [isGameRunning, manualConfirmation]);

  // Register player when connected
  useEffect(() => {
    if (socket && connected) {
      // Save to localStorage
      localStorage.setItem('battleconnect-player-name', playerName);
      localStorage.setItem('battleconnect-player-id', playerId);

      // Register with hosting service
      socket.emit('register-player', {
        playerId,
        playerName,
        hasGame: gameDetected || isGameRunning,
      });
    }
  }, [socket, connected, playerId, playerName, gameDetected, isGameRunning]);

  return (
    <div className='w-full h-screen bg-imperial-900 text-white relative'>
      {/* Background */}
      <div className='absolute inset-0 bg-gradient-to-br from-imperial-900 via-imperial-800 to-black' />

      {/* Main Content */}
      <div className='relative z-10 w-full h-full flex flex-col'>
        {/* Header */}
        <header className='flex items-center justify-between p-6 bg-imperial-800/80 backdrop-blur-sm border-b border-imperial-600'>
          <div className='flex items-center space-x-4'>
            <h1 className='text-3xl font-orbitron font-bold text-rebel-500'>BATTLECONNECT</h1>
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className='text-sm text-imperial-300'>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className='btn-secondary'
          >
            Instructions
          </button>
        </header>

        {/* Instructions Dropdown */}
        {showInstructions && (
          <InstructionsDropdown onClose={() => setShowInstructions(false)} />
        )}

        {/* Main Interface */}
        <div className='flex-1 flex min-h-0'>
          {/* Left Panel - Game Detection & Lobby */}
          <div className='w-80 p-4 space-y-4 overflow-y-auto min-h-0 flex-shrink-0'>
            {!gameDetected ? (
              <GameDetection onGameConfirmed={() => setGameDetected(true)} />
            ) : (
              <LobbyManager 
                socket={socket} 
                onJoinLobby={() => setInLobby(true)}
                onLeaveLobby={() => setInLobby(false)}
                hasGame={gameDetected || isGameRunning}
                playerId={playerId}
                playerName={playerName}
              />
            )}

            {/* Game Hosting */}
            <GameHosting
              playerId={playerId}
              playerName={playerName}
              hasGame={gameDetected || isGameRunning}
            />

            {/* Game Sync Panel */}
            {inLobby && <GameSyncPanel socket={socket} />}
          </div>

          {/* Center - Main View */}
          <div className='flex-1 p-4 overflow-y-auto min-h-0'>
            {gameDetected ? (
              <div className='panel h-full flex flex-col'>
                <div className='panel-header'>
                  <h2>Battlefront II Coordination</h2>
                </div>
                <div className='panel-content flex-1 overflow-hidden'>
                  <div className='h-full w-full bg-black rounded flex items-center justify-center'>
                    <div className='text-center'>
                      <h3 className='text-2xl font-orbitron mb-4'>Desktop View</h3>
                      <p className='text-imperial-300 mb-6'>
                        Game instance will be displayed here when hosting is active.
                      </p>
                      {!inLobby && (
                        <p className='text-rebel-400'>Join or create a lobby to begin coordination.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className='panel h-full flex flex-col'>
                <div className='panel-header'>
                  <h2>Welcome to Battleconnect</h2>
                </div>
                <div className='panel-content flex-1 overflow-hidden'>
                  <div className='h-full w-full bg-black rounded flex items-center justify-center'>
                    <div className='text-center'>
                      <h3 className='text-2xl font-orbitron mb-4'>Launch Battlefront II</h3>
                      <p className='text-imperial-300 mb-6'>
                        Start Star Wars Battlefront II on your system to begin coordination.
                      </p>
                      <p className='text-sm text-imperial-400'>
                        Supports EA App, Steam, Epic Games, and PS Remote Play
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Chat & Voice */}
          <div className='w-80 p-4 space-y-4 flex flex-col min-h-0 flex-shrink-0'>
            {/* Voice Chat */}
            <VoiceChat socket={socket} />

            {/* Persistent Chat */}
            <PersistentChat socket={socket} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;