import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { ScreenStreaming } from './ScreenStreaming';

interface Player {
  id: string;
  name: string;
  hasGame: boolean;
  isHost: boolean;
  isGuest: boolean;
  hostId?: string;
}

interface HostingRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  message: string;
  timestamp: number;
}

interface GameHostingProps {
  playerId: string;
  playerName: string;
  hasGame: boolean;
}

export const GameHosting: React.FC<GameHostingProps> = ({
  playerId,
  playerName,
  hasGame,
}) => {
  const { socket } = useWebSocket();
  const [availableHosts, setAvailableHosts] = useState<Player[]>([]);
  const [hostingRequests, setHostingRequests] = useState<HostingRequest[]>([]);
  const [isHostingEnabled, setIsHostingEnabled] = useState(false);
  const [currentGuest, setCurrentGuest] = useState<Player | null>(null);
  const [hostingStatus, setHostingStatus] = useState<'idle' | 'hosting' | 'guest'>('idle');
  const [sessionId, setSessionId] = useState<string | undefined>();

  useEffect(() => {
    if (!socket) return;

    // Listen for available hosts
    socket.on('hosts-updated', (hosts: Player[]) => {
      setAvailableHosts(hosts);
    });

    // Listen for hosting requests (when someone wants you to host)
    socket.on('hosting-request', (request: HostingRequest) => {
      setHostingRequests(prev => [...prev, request]);
    });

    // Listen for hosting accepted/rejected
    socket.on('hosting-accepted', (hostData: { hostId: string; hostName: string }) => {
      setHostingStatus('guest');
    });

    socket.on('hosting-rejected', (data: { hostId: string; reason: string }) => {
      alert(`Hosting request rejected: ${data.reason}`);
    });

    // Listen for hosting session started
    socket.on('hosting-session-started', (guestData: Player) => {
      setCurrentGuest(guestData);
      setHostingStatus('hosting');
    });

    // Listen for hosting session ended
    socket.on('hosting-session-ended', () => {
      setCurrentGuest(null);
      setHostingStatus('idle');
    });

    return () => {
      socket.off('hosts-updated');
      socket.off('hosting-request');
      socket.off('hosting-accepted');
      socket.off('hosting-rejected');
      socket.off('hosting-session-started');
      socket.off('hosting-session-ended');
    };
  }, [socket]);

  const toggleHosting = () => {
    if (!socket || !hasGame) return;

    const newHostingState = !isHostingEnabled;
    setIsHostingEnabled(newHostingState);

    socket.emit('set-hosting-availability', {
      playerId,
      playerName,
      available: newHostingState,
    });
  };

  const requestHosting = (hostId: string) => {
    if (!socket) return;

    const message = prompt('Add a message for your hosting request (optional):') || '';
    
    socket.emit('request-hosting', {
      requesterId: playerId,
      requesterName: playerName,
      hostId,
      message,
    });
  };

  const respondToRequest = (requestId: string, accept: boolean, reason?: string) => {
    if (!socket) return;

    socket.emit('respond-to-hosting-request', {
      requestId,
      hostId: playerId,
      accept,
      reason,
    });

    // Remove the request from the list
    setHostingRequests(prev => prev.filter(req => req.id !== requestId));
  };

  const endHostingSession = () => {
    if (!socket) return;

    socket.emit('end-hosting-session', {
      hostId: playerId,
    });
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-yellow-600">
      <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center">
        <span className="mr-2">🎮</span>
        Game Hosting
      </h3>

      {hasGame ? (
        <div className="space-y-4">
          {/* Host Controls */}
          <div className="bg-gray-800 rounded p-4">
            <h4 className="font-semibold text-white mb-2">Host Your Game</h4>
            <div className="flex items-center justify-between">
              <span className='text-gray-300'>
                Share your Battlefront game with others
              </span>
              <button
                onClick={toggleHosting}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  isHostingEnabled
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                {isHostingEnabled ? 'Stop Hosting' : 'Start Hosting'}
              </button>
            </div>
            {isHostingEnabled && (
              <p className="text-green-400 text-sm mt-2">
                ✓ You're available to share your game with players without Battlefront
              </p>
            )}
          </div>

          {/* Current Hosting Session */}
          {hostingStatus === 'hosting' && currentGuest && (
            <div className="bg-green-900 rounded p-4 border border-green-600">
              <h4 className="font-semibold text-green-400 mb-2">Currently Hosting</h4>
              <div className="flex items-center justify-between">
                <span className="text-white">
                  Hosting: <strong>{currentGuest.name}</strong>
                </span>
                <button
                  onClick={endHostingSession}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  End Session
                </button>
              </div>
              <p className="text-green-300 text-sm mt-2">
                The guest can now access and play your Battlefront II alongside you
              </p>
            </div>
          )}

          {/* Hosting Requests */}
          {hostingRequests.length > 0 && (
            <div className="bg-blue-900 rounded p-4 border border-blue-600">
              <h4 className="font-semibold text-blue-400 mb-3">Hosting Requests</h4>
              {hostingRequests.map(request => (
                <div key={request.id} className="bg-blue-800 rounded p-3 mb-3 last:mb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-white">{request.requesterName}</p>
                      {request.message && (
                        <p className="text-blue-200 text-sm mt-1">"{request.message}"</p>
                      )}
                    </div>
                    <span className="text-blue-300 text-xs">
                      {new Date(request.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => respondToRequest(request.id, true)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for declining (optional):') || 'No reason given';
                        respondToRequest(request.id, false, reason);
                      }}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Guest Mode - Request Hosting */}
          {hostingStatus === 'idle' && (
            <div className="bg-gray-800 rounded p-4">
              <h4 className="font-semibold text-white mb-2">Request Game Access</h4>
              <p className="text-gray-300 mb-4">
                You don't have Battlefront installed. Request another player to share their game instance with you.
              </p>
              
              {availableHosts.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-yellow-400 font-medium">Available Hosts:</p>
                  {availableHosts.map(host => (
                    <div key={host.id} className="flex items-center justify-between bg-gray-700 rounded p-3">
                      <span className="text-white font-medium">{host.name}</span>
                      <button
                        onClick={() => requestHosting(host.id)}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-black rounded font-medium"
                      >
                        Request Hosting
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">
                  No players are currently available to host. 
                  <br />
                  Ask someone with Battlefront to enable hosting!
                </p>
              )}
            </div>
          )}

          {/* Currently Being Hosted */}
          {hostingStatus === 'guest' && (
            <div className="bg-green-900 rounded p-4 border border-green-600">
              <h4 className="font-semibold text-green-400 mb-2">Connected as Guest</h4>
              <p className="text-white">
                You're now sharing a host's Battlefront game!
              </p>
              <p className="text-green-300 text-sm mt-2">
                You can play Battlefront II using their game instance while they continue playing
              </p>
              <div className="mt-3">
                <button
                  onClick={() => {
                    if (socket) {
                      socket.emit('disconnect-from-host', { guestId: playerId });
                      setHostingStatus('idle');
                    }
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-800 rounded border-l-4 border-yellow-600">
        <p className="text-yellow-300 text-sm">
          <strong>How it works:</strong> Players with Battlefront can share their game instance, 
          allowing players without the game to access and play Battlefront II. Both players can 
          play simultaneously - the host continues playing normally while the guest uses the shared instance.
        </p>
      </div>
    </div>
  );
};