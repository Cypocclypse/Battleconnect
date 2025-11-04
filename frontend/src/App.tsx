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
                hasGame={hasGameOwnership}
                playerId={playerId}
                playerName={playerName}
              />
            )}

            {/* Game Hosting */}
            <GameHosting
              playerId={playerId}
              playerName={playerName}
              hasGame={hasGameOwnership}
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
                    <div className='h-full w-full flex flex-col'>
                      {/* Match Coordination Header */}
                      <div className='p-4 border-b' style={{borderColor: '#495057'}}>
                        <h3 className='text-lg font-bold text-white mb-2'>Battlefront II Match Coordination</h3>
                        <p className='text-sm' style={{color: '#ced4da'}}>
                          Join coordinated multiplayer matches with other players
                        </p>
                      </div>
                      
                      {/* Match Info Area */}
                      <div className='flex-1 p-6 flex items-center justify-center'>
                        {inLobby ? (
                          <div className='text-center max-w-md'>
                            <div className='mb-6' style={{fontSize: '4rem'}}>⚔️</div>
                            <h3 className='text-2xl font-bold text-white mb-4'>Ready for Coordinated Match</h3>
                            <p className='text-gray-400 mb-6'>
                              Launch Battlefront II and join the same multiplayer lobby as your teammates
                            </p>
                            <div className='space-y-3 text-sm' style={{color: '#ced4da'}}>
                              <div className='p-3 rounded' style={{backgroundColor: '#212529'}}>
                                <p className='font-semibold mb-2'>🎯 Match Instructions:</p>
                                <p>1. Launch Battlefront II</p>
                                <p>2. Go to Multiplayer</p>
                                <p>3. Join the same game mode/map</p>
                                <p>4. Coordinate via voice chat</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className='text-center'>
                            <div className='mb-6' style={{fontSize: '4rem'}}>🎮</div>
                            <h3 className='text-2xl font-bold text-white mb-4'>Join a Lobby</h3>
                            <p className='text-gray-400 mb-6'>
                              Create or join a lobby to coordinate Battlefront II matches with other players
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className='h-full w-full flex flex-col'>
                      {/* Hosted Match Header */}
                      <div className='p-4 border-b' style={{borderColor: '#495057'}}>
                        <h3 className='text-lg font-bold text-white mb-2'>Hosted Match Participation</h3>
                        <p className='text-sm' style={{color: '#ced4da'}}>
                          Join Battlefront II matches through game owners who can host you
                        </p>
                      </div>
                      
                      {/* Hosting Info Area */}
                      <div className='flex-1 p-6 flex items-center justify-center'>
                        {inLobby ? (
                          <div className='text-center max-w-md'>
                            <div className='mb-6' style={{fontSize: '4rem'}}>🤝</div>
                            <h3 className='text-2xl font-bold text-white mb-4'>Request Game Hosting</h3>
                            <p className='text-gray-400 mb-6'>
                              Ask lobby members who own Battlefront II to host you in their matches
                            </p>
                            <div className='space-y-3 text-sm' style={{color: '#ced4da'}}>
                              <div className='p-3 rounded' style={{backgroundColor: '#212529'}}>
                                <p className='font-semibold mb-2'>🎯 How It Works:</p>
                                <p>1. Request hosting from game owners</p>
                                <p>2. They invite you to their match</p>
                                <p>3. Join the same multiplayer lobby</p>
                                <p>4. Play together in coordinated teams</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className='text-center'>
                            <div className='mb-6' style={{fontSize: '4rem'}}>🔍</div>
                            <h3 className='text-2xl font-bold text-white mb-4'>Find Game Owners</h3>
                            <p className='text-gray-400 mb-6'>
                              Join a lobby to find players who own Battlefront II and can host matches
                            </p>
                          </div>
                        )}
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