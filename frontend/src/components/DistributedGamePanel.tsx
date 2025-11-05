import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface DistributedGamePanelProps {
  lobbyId: string;
  gameSettings: {
    map: string;
    mode: string;
    factions: { light: string; dark: string };
  };
}

interface GameInstance {
  id: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
  status: 'launching' | 'running' | 'crashed' | 'reconnecting';
  platform: 'steam' | 'ea' | 'epic' | 'ps-remote';
  playerCount: number;
}

interface NetworkStatus {
  totalInstances: number;
  activeInstances: number;
  hostInstance: string | null;
  isDistributed: boolean;
  sessionHealth: 'healthy' | 'degraded' | 'critical';
}

export function DistributedGamePanel({ lobbyId, gameSettings }: DistributedGamePanelProps) {
  const [gameInstances, setGameInstances] = useState<GameInstance[]>([]);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    totalInstances: 0,
    activeInstances: 0,
    hostInstance: null,
    isDistributed: false,
    sessionHealth: 'healthy'
  });
  const [launchStatus, setLaunchStatus] = useState<'idle' | 'detecting' | 'launching' | 'running' | 'failed'>('idle');
  const [localInstance, setLocalInstance] = useState<GameInstance | null>(null);

  const { socket, sendMessage } = useWebSocket('ws://localhost:3001');

  useEffect(() => {
    // Set up Electron event listeners if available
    if (window.electronAPI) {
      window.electronAPI.onGameLaunched((data) => {
        console.log('⚡ Electron: Game launched:', data);
        setLaunchStatus('running');
        if (data.isLocalInstance) {
          setLocalInstance(data.instance);
        }
      });

      window.electronAPI.onInstanceRegistered((data) => {
        console.log('⚡ Electron: Instance registered:', data);
        updateNetworkStatus(data);
      });

      window.electronAPI.onHostPromoted((data) => {
        console.log('⚡ Electron: Host promoted:', data);
        setNetworkStatus(prev => ({
          ...prev,
          hostInstance: data.newHostId
        }));
      });

      window.electronAPI.onReconnectionSuccess((data) => {
        console.log('⚡ Electron: Reconnection successful:', data);
        updateInstanceStatus(data.instanceId, 'running');
      });

      window.electronAPI.onInstanceCrashed((data) => {
        console.log('⚡ Electron: Instance crashed:', data);
        updateInstanceStatus(data.instanceId, 'crashed');
      });
    }

    if (!socket) return;

    // Listen for distributed game events
    socket.on('game-launched', (data) => {
      console.log('🎮 Game launched:', data);
      setLaunchStatus('running');
      
      if (data.isLocalInstance) {
        setLocalInstance(data.instance);
      }
    });

    socket.on('instance-registered', (data) => {
      console.log('📡 Instance registered:', data);
      updateNetworkStatus(data);
    });

    socket.on('host-promoted', (data) => {
      console.log('👑 New host promoted:', data);
      setNetworkStatus(prev => ({
        ...prev,
        hostInstance: data.newHostId
      }));
    });

    socket.on('game-instances-updated', (instances: GameInstance[]) => {
      console.log('🔄 Game instances updated:', instances);
      setGameInstances(instances);
    });

    socket.on('network-status-updated', (status: NetworkStatus) => {
      setNetworkStatus(status);
    });

    socket.on('reconnection-success', (data) => {
      console.log('✅ Reconnection successful:', data);
      updateInstanceStatus(data.instanceId, 'running');
    });

    socket.on('instance-crashed', (data) => {
      console.log('💥 Instance crashed:', data);
      updateInstanceStatus(data.instanceId, 'crashed');
    });

    return () => {
      socket.off('game-launched');
      socket.off('instance-registered');
      socket.off('host-promoted');
      socket.off('game-instances-updated');
      socket.off('network-status-updated');
      socket.off('reconnection-success');
      socket.off('instance-crashed');
    };
  }, [socket]);

  const updateNetworkStatus = (data: any) => {
    setNetworkStatus(prev => ({
      ...prev,
      totalInstances: data.totalInstances || prev.totalInstances,
      activeInstances: data.activeInstances || prev.activeInstances,
      isDistributed: (data.totalInstances || prev.totalInstances) > 1,
      sessionHealth: calculateSessionHealth(data.totalInstances || prev.totalInstances, data.activeInstances || prev.activeInstances)
    }));
  };

  const updateInstanceStatus = (instanceId: string, status: GameInstance['status']) => {
    setGameInstances(prev => 
      prev.map(instance => 
        instance.id === instanceId 
          ? { ...instance, status }
          : instance
      )
    );
  };

  const calculateSessionHealth = (total: number, active: number): 'healthy' | 'degraded' | 'critical' => {
    const ratio = active / total;
    if (ratio >= 0.8) return 'healthy';
    if (ratio >= 0.5) return 'degraded';
    return 'critical';
  };

  const handleAutoLaunch = async () => {
    setLaunchStatus('detecting');
    
    try {
      console.log('🚀 BATTLECONNECT: Starting auto-launch sequence...');
      
      // First try Electron IPC if available
      if (window.electronAPI) {
        console.log('⚡ Using Electron launcher');
        
        const result = await window.electronAPI.launchDistributedGame({
          sessionId: lobbyId,
          gameSettings,
          autoDetect: true,
          fallbackToHosting: true
        });
        
        if (result === 'launched') {
          setLaunchStatus('running');
        } else if (result === 'requesting_host') {
          setLaunchStatus('idle');
          // Show hosting request UI
        }
      } else {
        console.log('🌐 Using WebSocket fallback');
        
        // Fallback to backend WebSocket
        sendMessage('launch-distributed-game', {
          sessionId: lobbyId,
          gameSettings,
          autoDetect: true,
          fallbackToHosting: true
        });

        setLaunchStatus('launching');
      }
      
    } catch (error) {
      console.error('💥 Auto-launch failed:', error);
      setLaunchStatus('failed');
    }
  };

  const handleForceReconnection = (instanceId: string) => {
    console.log('🔄 Forcing reconnection for instance:', instanceId);
    
    sendMessage('force-reconnection', {
      sessionId: lobbyId,
      instanceId
    });
  };

  const getStatusColor = (status: GameInstance['status']) => {
    switch (status) {
      case 'running': return 'text-green-400';
      case 'launching': return 'text-yellow-400';
      case 'crashed': return 'text-red-400';
      case 'reconnecting': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getHealthColor = (health: NetworkStatus['sessionHealth']) => {
    switch (health) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>🚀</span>
          Battleconnect Distributed Network
        </h2>
        
        {/* Network Status Badge */}
        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getHealthColor(networkStatus.sessionHealth)} bg-gray-800 border border-gray-600`}>
          {networkStatus.sessionHealth.toUpperCase()} • {networkStatus.activeInstances}/{networkStatus.totalInstances} Active
        </div>
      </div>

      {/* Auto-Launch Section */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Revolutionary Auto-Launch</h3>
            <p className="text-gray-400 text-sm">
              Automatically detects Battlefront II installations and creates distributed multiplayer session
            </p>
          </div>
          
          <button
            onClick={handleAutoLaunch}
            disabled={launchStatus !== 'idle'}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              launchStatus === 'idle'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : launchStatus === 'failed'
                ? 'bg-red-600 text-white cursor-not-allowed'
                : 'bg-yellow-600 text-white cursor-wait'
            }`}
          >
            {launchStatus === 'idle' && '🎮 Auto-Launch Game'}
            {launchStatus === 'detecting' && '🔍 Detecting Installations...'}
            {launchStatus === 'launching' && '🚀 Launching Game...'}
            {launchStatus === 'running' && '✅ Game Running'}
            {launchStatus === 'failed' && '❌ Launch Failed'}
          </button>
        </div>

        {/* Game Settings Display */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400">Map</div>
            <div className="text-white font-semibold">{gameSettings.map}</div>
          </div>
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400">Mode</div>
            <div className="text-white font-semibold">{gameSettings.mode}</div>
          </div>
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400">Factions</div>
            <div className="text-white font-semibold text-xs">
              {gameSettings.factions.light} vs {gameSettings.factions.dark}
            </div>
          </div>
        </div>
      </div>

      {/* Distributed Network Status */}
      {networkStatus.isDistributed && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span>🌐</span>
            Distributed Network Status
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-700 rounded p-3">
              <div className="text-gray-400 text-sm">Total Instances</div>
              <div className="text-2xl font-bold text-white">{networkStatus.totalInstances}</div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-gray-400 text-sm">Active Instances</div>
              <div className="text-2xl font-bold text-green-400">{networkStatus.activeInstances}</div>
            </div>
          </div>

          {/* Instance List */}
          <div className="space-y-2">
            <h4 className="text-white font-medium">Game Instances</h4>
            {gameInstances.map((instance) => (
              <div
                key={instance.id}
                className="flex items-center justify-between bg-gray-700 rounded p-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    instance.status === 'running' ? 'bg-green-400' :
                    instance.status === 'launching' ? 'bg-yellow-400' :
                    instance.status === 'crashed' ? 'bg-red-400' :
                    'bg-blue-400'
                  }`} />
                  
                  <div>
                    <div className="text-white font-medium flex items-center gap-2">
                      {instance.playerName}
                      {instance.isHost && <span className="text-yellow-400">👑</span>}
                      {instance.id === localInstance?.id && <span className="text-blue-400">(You)</span>}
                    </div>
                    <div className={`text-sm ${getStatusColor(instance.status)}`}>
                      {instance.status.charAt(0).toUpperCase() + instance.status.slice(1)} • {instance.platform}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">
                    {instance.playerCount} players
                  </span>
                  
                  {instance.status === 'crashed' && (
                    <button
                      onClick={() => handleForceReconnection(instance.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                    >
                      🔄 Reconnect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revolutionary Features Info */}
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <span>⚡</span>
          Revolutionary Features
        </h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <strong>Auto-Detection:</strong> Automatically finds Battlefront II installations (Steam/EA/Epic)</li>
          <li>• <strong>Distributed Network:</strong> Games survive host crashes with automatic promotion</li>
          <li>• <strong>Seamless Reconnection:</strong> Crashed instances auto-reconnect with state sync</li>
          <li>• <strong>Override Injection:</strong> Forces multiplayer mode even in singleplayer</li>
          <li>• <strong>Cross-Platform:</strong> Works with all PC versions and PS Remote Play</li>
        </ul>
      </div>
    </div>
  );
}