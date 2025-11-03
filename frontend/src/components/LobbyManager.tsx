import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Lobby, MatchType, FactionMatchup } from '../types';

interface LobbyManagerProps {
  socket: Socket | null;
  onJoinLobby: () => void;
  onLeaveLobby: () => void;
  hasGame: boolean;
  playerId: string;
  playerName: string;
}

export function LobbyManager({ socket, onJoinLobby, onLeaveLobby, hasGame, playerId, playerName }: LobbyManagerProps) {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLobbyName, setNewLobbyName] = useState('');
  const [selectedLobby, setSelectedLobby] = useState<Lobby | null>(null);
  const [showHostingRequest, setShowHostingRequest] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('lobbies-updated', (updatedLobbies: Lobby[]) => {
      setLobbies(updatedLobbies);
    });

    socket.on('lobby-joined', (lobby: Lobby) => {
      setCurrentLobby(lobby);
      onJoinLobby();
    });

    socket.on('lobby-left', () => {
      setCurrentLobby(null);
      onLeaveLobby();
    });

    // Request initial lobby list
    socket.emit('get-lobbies');

    return () => {
      socket.off('lobbies-updated');
      socket.off('lobby-joined');
      socket.off('lobby-left');
    };
  }, [socket, onJoinLobby, onLeaveLobby]);

  const handleCreateLobby = () => {
    if (!socket || !newLobbyName.trim()) return;

    socket.emit('create-lobby', {
      name: newLobbyName.trim(),
      maxPlayers: 20, // Standard Battlefront II match size
    });

    setNewLobbyName('');
    setShowCreateForm(false);
  };

  const handleJoinLobby = (lobbyId: string) => {
    if (!socket) return;
    socket.emit('join-lobby', lobbyId);
  };

  const handleLeaveLobby = () => {
    if (!socket) return;
    socket.emit('leave-lobby');
  };

  if (currentLobby) {
    return (
      <div className='panel'>
        <div className='panel-header'>
          <div className='flex items-center justify-between'>
            <h2>{currentLobby.name}</h2>
            <button onClick={handleLeaveLobby} className='btn-danger text-sm'>
              Leave
            </button>
          </div>
        </div>
        <div className='panel-content'>
          <div className='space-y-4'>
            <div>
              <p className='text-sm text-imperial-300'>
                Players: {currentLobby.players.length}/{currentLobby.maxPlayers}
              </p>
              <p className='text-sm text-imperial-300'>
                Status: {currentLobby.status}
              </p>
            </div>

            <div>
              <h4 className='font-semibold mb-2'>Players</h4>
              <div className='space-y-1'>
                {currentLobby.players.map(player => (
                  <div key={player.id} className='flex items-center justify-between text-sm'>
                    <span className={player.connected ? 'text-green-400' : 'text-red-400'}>
                      {player.name} {player.id === currentLobby.hostId && '(Host)'}
                    </span>
                    <span className={`text-xs ${player.ready ? 'text-green-400' : 'text-imperial-400'}`}>
                      {player.ready ? 'Ready' : 'Not Ready'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {currentLobby.matchType && (
              <div>
                <h4 className='font-semibold mb-2'>Match Configuration</h4>
                <p className='text-sm text-imperial-300'>
                  Type: {currentLobby.matchType.replace('-', ' ').toUpperCase()}
                </p>
                {currentLobby.factionMatchup && (
                  <p className='text-sm text-imperial-300'>
                    {currentLobby.factionMatchup.lightSide.toUpperCase()} vs {currentLobby.factionMatchup.darkSide.toUpperCase()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='panel'>
      <div className='panel-header'>
        <div className='flex items-center justify-between'>
          <h2>Available Lobbies</h2>
          {hasGame ? (
            <button 
              onClick={() => setShowCreateForm(true)}
              className='btn-primary text-sm'
            >
              Create
            </button>
          ) : (
            <div className='text-sm text-gray-400'>
              Need Battlefront to create rooms
            </div>
          )}
        </div>
      </div>
      <div className='panel-content'>
        {showCreateForm && (
          <div className='mb-4 p-4 bg-imperial-700 rounded border border-imperial-600'>
            <h4 className='font-semibold mb-2'>Create New Lobby</h4>
            <div className='space-y-2'>
              <input
                type='text'
                placeholder='Lobby name...'
                value={newLobbyName}
                onChange={(e) => setNewLobbyName(e.target.value)}
                className='input-field w-full'
                maxLength={30}
              />
              <div className='flex space-x-2'>
                <button onClick={handleCreateLobby} className='btn-primary flex-1'>
                  Create
                </button>
                <button 
                  onClick={() => setShowCreateForm(false)}
                  className='btn-secondary flex-1'
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className='space-y-2'>
          {lobbies.length === 0 ? (
            <div className='text-center py-8'>
              <p className='text-imperial-400'>No active lobbies</p>
              <p className='text-sm text-imperial-500'>Create one to get started</p>
            </div>
          ) : (
            lobbies.map(lobby => (
              <div
                key={lobby.id}
                className='bg-imperial-700 p-3 rounded border border-imperial-600 hover:border-imperial-500 transition-colors cursor-pointer'
                onClick={() => {
                  if (hasGame) {
                    handleJoinLobby(lobby.id);
                  } else {
                    setSelectedLobby(lobby);
                    setShowHostingRequest(true);
                  }
                }}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <h4 className='font-semibold'>{lobby.name}</h4>
                    <p className='text-sm text-imperial-300'>
                      {lobby.players.length}/{lobby.maxPlayers} players
                    </p>
                  </div>
                  <div className='text-sm text-imperial-400 pointer-events-none'>
                    {hasGame ? (
                      <span className='bg-green-600 text-white px-2 py-1 rounded'>
                        Join
                      </span>
                    ) : (
                      <span className='bg-yellow-600 text-white px-2 py-1 rounded'>
                        Request Host
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hosting Request Modal */}
      {showHostingRequest && selectedLobby && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-imperial-800 p-6 rounded-lg border border-imperial-600 max-w-md w-full mx-4'>
            <h3 className='text-xl font-semibold text-yellow-400 mb-4'>
              Request Game Hosting
            </h3>
            
            <div className='mb-4'>
              <p className='text-white mb-2'>
                You want to join: <strong>{selectedLobby.name}</strong>
              </p>
              <p className='text-imperial-300 text-sm mb-4'>
                Since you don't have Battlefront II installed, you'll need someone in this lobby to share their game instance with you.
              </p>
              
              <div className='bg-imperial-700 p-3 rounded mb-4'>
                <h4 className='font-semibold text-white mb-2'>Players in this lobby:</h4>
                {selectedLobby.players.length > 0 ? (
                  <ul className='text-sm text-imperial-300'>
                    {selectedLobby.players.map((player, index) => (
                      <li key={index}>• {player.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className='text-imperial-400 text-sm'>No players yet</p>
                )}
              </div>
            </div>

            <div className='flex space-x-3'>
              <button
                onClick={() => {
                  if (socket && selectedLobby.players.length > 0) {
                    // Send hosting request to lobby
                    socket.emit('request-lobby-hosting', {
                      requesterId: playerId,
                      requesterName: playerName,
                      lobbyId: selectedLobby.id,
                      message: `${playerName} would like to join ${selectedLobby.name} but needs game hosting`
                    });
                    
                    setShowHostingRequest(false);
                    setSelectedLobby(null);
                    
                    alert('Hosting request sent to lobby members!');
                  } else {
                    alert('No players in this lobby to send request to.');
                  }
                }}
                className='flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded font-medium transition-colors'
              >
                Send Request
              </button>
              <button
                onClick={() => {
                  setShowHostingRequest(false);
                  setSelectedLobby(null);
                }}
                className='flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium transition-colors'
              >
                Cancel
              </button>
            </div>

            <div className='mt-4 p-3 bg-blue-900 rounded border border-blue-600'>
              <p className='text-blue-200 text-sm'>
                <strong>How it works:</strong> Your request will be sent to all players in this lobby. 
                If someone accepts, they'll share their Battlefront II game instance with you so you can both play.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}