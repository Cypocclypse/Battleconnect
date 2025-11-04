import { useState, useEffect } from 'react';
import { GameDetection } from './components/GameDetection';
import { LobbyManager } from './components/LobbyManager';
import { VoiceChat } from './components/VoiceChat';
import { PersistentChat } from './components/PersistentChat';
import { GameSyncPanel } from './components/GameSyncPanel';
import { InstructionsDropdown } from './components/InstructionsDropdown';
import { GameHosting } from './components/GameHosting';
import { DesktopCapture } from './components/DesktopCapture';
import { useWebSocket } from './hooks/useWebSocket';
import { useGameDetection } from './hooks/useGameDetection';

function App() {
  const [gameDetected, setGameDetected] = useState(false);
  const [inLobby, setInLobby] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [hasGameOwnership, setHasGameOwnership] = useState(false);
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
    <div className='w-full h-screen text-white' style={{backgroundColor: '#0d1117'}}>
      {/* Main Content */}
      <div className='w-full h-full flex flex-col'>
        {/* Header */}
        <header className='flex items-center justify-between p-6 border-b' style={{backgroundColor: 'rgba(33, 37, 41, 0.8)', borderColor: '#495057'}}>
          <div className='flex items-center space-x-4'>
            <h1 className='text-3xl font-bold' style={{color: '#f97316'}}>BATTLECONNECT</h1>
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className='text-sm' style={{color: '#ced4da'}}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className='px-4 py-2 rounded text-white'
            style={{backgroundColor: '#495057'}}
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
              <GameDetection onGameConfirmed={(hasGame) => {
                setGameDetected(true);
                setHasGameOwnership(hasGame);
              }} />
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

            {/* Room Status */}
            {(gameDetected || isGameRunning) && (
              <div className='panel'>
                <div className='panel-header'>
                  <h2>Room Status</h2>
                </div>
                <div className='panel-content'>
                  <div className='space-y-3'>
                    <div className='p-3 rounded' style={{backgroundColor: '#212529'}}>
                      <div className='flex items-center space-x-2 mb-2'>
                        <div className={`w-2 h-2 rounded-full ${inLobby ? 'bg-green-500' : 'bg-gray-500'}`} />
                        <span className='text-sm font-semibold text-white'>
                          {inLobby ? 'In Room' : 'Not in Room'}
                        </span>
                      </div>
                      <div className='text-xs' style={{color: '#ced4da'}}>
                        {hasGameOwnership 
                          ? 'Game owner - can launch and create rooms'
                          : 'Hosted player - will connect to someone else\'s game'
                        }
                      </div>
                    </div>
                    
                    {inLobby && (
                      <div className='text-xs' style={{color: '#6c757d'}}>
                        <p>✅ Connected to multiplayer coordination</p>
                        <p>🎮 Ready for synchronized matches</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Game Sync Panel */}
            {inLobby && <GameSyncPanel socket={socket} />}
          </div>

          {/* Center - Main View */}
          <div className='flex-1 p-4 overflow-y-auto min-h-0'>
            {gameDetected ? (
              <div className='panel h-full flex flex-col'>
                <div className='panel-header'>
                  <h2>
                    {hasGameOwnership ? 'Battlefront II Coordination' : 'Hosted Battlefront II Connection'}
                  </h2>
                </div>
                <div className='panel-content flex-1 overflow-hidden'>
                  {hasGameOwnership ? (
                    <div className='h-full w-full bg-black rounded flex flex-col'>
                      {/* Desktop View Header */}
                      <div className='p-4 border-b' style={{borderColor: '#495057'}}>
                        <h3 className='text-lg font-bold text-white mb-2'>Desktop View</h3>
                        <p className='text-sm' style={{color: '#ced4da'}}>
                          Launch Battlefront II from your desktop (EA App, Steam, Epic, or PS Remote Play)
                        </p>
                      </div>
                      
                      {/* Desktop Area */}
                      <div className='flex-1 flex items-center justify-center p-4'>
                        <DesktopCapture />
                      </div>
                    </div>
                  ) : (
                    <div className='h-full w-full bg-black rounded flex flex-col'>
                      {/* Hosted Game View Header */}
                      <div className='p-4 border-b' style={{borderColor: '#495057'}}>
                        <h3 className='text-lg font-bold text-white mb-2'>Hosted Battlefront II</h3>
                        <p className='text-sm' style={{color: '#ced4da'}}>
                          Playing via hosted connection - you'll see and control the host's game
                        </p>
                      </div>
                      
                      {/* Game Stream Area */}
                      <div className='flex-1 flex items-center justify-center p-4'>
                        <div className='w-full h-full flex items-center justify-center'>
                          {inLobby ? (
                            <div className='text-center'>
                              <div className='mb-6' style={{fontSize: '4rem'}}>🎮</div>
                              <h3 className='text-xl font-bold text-white mb-4'>Connected to Host's Game</h3>
                              <p className='text-gray-400 mb-6'>
                                Battlefront II will appear here when host starts their game
                              </p>
                              <div className='p-4 rounded border' style={{backgroundColor: '#212529', borderColor: '#495057'}}>
                                <div className='flex items-center space-x-2 mb-2'>
                                  <div className='w-2 h-2 rounded-full bg-green-500 animate-pulse' />
                                  <span className='text-sm text-white'>Connected to host</span>
                                </div>
                                <p className='text-xs' style={{color: '#ced4da'}}>
                                  🎯 You can control the host's game using your keyboard and mouse
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className='text-center'>
                              <div className='mb-6' style={{fontSize: '4rem'}}>🔍</div>
                              <h3 className='text-xl font-bold text-white mb-4'>Find a Host</h3>
                              <p className='text-gray-400 mb-6'>
                                Join a lobby and request hosting from players who own Battlefront II
                              </p>
                              <div className='p-4 rounded border' style={{backgroundColor: '#212529', borderColor: '#495057'}}>
                                <p className='text-sm' style={{color: '#ced4da'}}>
                                  💡 Once connected, you'll play Battlefront II through the host's game
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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