import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { SyncEvent } from '../types';

interface GameSyncPanelProps {
  socket: Socket | null;
}

export function GameSyncPanel({ socket }: GameSyncPanelProps) {
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [matchStatus, setMatchStatus] = useState<'waiting' | 'starting' | 'in-progress' | 'ended'>('waiting');

  useEffect(() => {
    if (!socket) return;

    socket.on('sync-event', (event: SyncEvent) => {
      setSyncEvents((prev: SyncEvent[]) => [...prev.slice(-9), event]); // Keep last 10 events
      
      if (event.type === 'countdown') {
        setCountdown(event.payload.seconds);
      } else if (event.type === 'match-start') {
        setMatchStatus('in-progress');
        setCountdown(null);
      } else if (event.type === 'match-end') {
        setMatchStatus('ended');
        setCountdown(null);
      }
    });

    socket.on('match-countdown', (seconds: number) => {
      setCountdown(seconds);
      setMatchStatus('starting');
    });

    socket.on('match-started', () => {
      setMatchStatus('in-progress');
      setCountdown(null);
    });

    socket.on('match-ended', () => {
      setMatchStatus('ended');
      setCountdown(null);
    });

    return () => {
      socket.off('sync-event');
      socket.off('match-countdown');
      socket.off('match-started');
      socket.off('match-ended');
    };
  }, [socket]);

  const formatEventTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEventIcon = (type: SyncEvent['type']) => {
    switch (type) {
      case 'match-start':
        return (
          <svg className='w-4 h-4 text-green-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10V9a3 3 0 013-3m-3 4h3M9 10v1a3 3 0 003 3m0-4V9a3 3 0 013-3m0 4h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H21' />
          </svg>
        );
      case 'match-end':
        return (
          <svg className='w-4 h-4 text-red-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 10h6m-6 4h6' />
          </svg>
        );
      case 'team-assignment':
        return (
          <svg className='w-4 h-4 text-blue-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
          </svg>
        );
      case 'countdown':
        return (
          <svg className='w-4 h-4 text-yellow-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
          </svg>
        );
      default:
        return (
          <svg className='w-4 h-4 text-imperial-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
          </svg>
        );
    }
  };

  const getEventMessage = (event: SyncEvent) => {
    switch (event.type) {
      case 'match-start':
        return 'Match has started! Launch your game now.';
      case 'match-end':
        return 'Match ended. Return to lobby.';
      case 'team-assignment':
        return `Teams assigned: ${event.payload.lightSide} vs ${event.payload.darkSide}`;
      case 'countdown':
        return `Match starting in ${event.payload.seconds} seconds`;
      default:
        return 'Sync event received';
    }
  };

  return (
    <div className='panel'>
      <div className='panel-header'>
        <div className='flex items-center justify-between'>
          <h2>Match Sync</h2>
          <div className={`px-2 py-1 rounded text-xs font-semibold ${
            matchStatus === 'waiting' ? 'bg-gray-600' :
            matchStatus === 'starting' ? 'bg-yellow-600' :
            matchStatus === 'in-progress' ? 'bg-green-600' :
            'bg-red-600'
          }`}>
            {matchStatus.toUpperCase().replace('-', ' ')}
          </div>
        </div>
      </div>
      <div className='panel-content'>
        {/* Countdown */}
        {countdown !== null && (
          <div className='bg-rebel-600 p-4 rounded mb-4 text-center'>
            <div className='text-2xl font-orbitron font-bold mb-2'>
              {countdown}
            </div>
            <p className='text-sm'>
              {countdown > 0 ? 'Match starting in...' : 'Launch your game now!'}
            </p>
          </div>
        )}

        {/* Match Instructions */}
        {matchStatus === 'in-progress' && (
          <div className='bg-green-600/20 border border-green-600 p-3 rounded mb-4'>
            <h3 className='font-semibold text-green-400 mb-2'>Match Active</h3>
            <div className='text-sm space-y-1'>
              <p>• Your game should be running</p>
              <p>• Join the coordinated match</p>
              <p>• Follow team assignments</p>
              <p>• Use voice chat for coordination</p>
            </div>
          </div>
        )}

        {/* Sync Events Feed */}
        <div className='space-y-2'>
          <h3 className='font-semibold text-sm text-imperial-300'>Recent Events</h3>
          {syncEvents.length === 0 ? (
            <p className='text-sm text-imperial-400 text-center py-4'>
              No sync events yet. Join a lobby to see match coordination.
            </p>
          ) : (
            <div className='space-y-2 max-h-32 overflow-y-auto'>
              {syncEvents.map((event, index) => (
                <div key={index} className='flex items-start space-x-2 bg-imperial-700 p-2 rounded text-sm'>
                  <div className='flex-shrink-0 mt-0.5'>
                    {getEventIcon(event.type)}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-white break-words'>
                      {getEventMessage(event)}
                    </p>
                    <p className='text-xs text-imperial-400 mt-1'>
                      {formatEventTime(event.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Game Launch Reminder */}
        {matchStatus === 'waiting' && (
          <div className='mt-4 p-3 bg-imperial-700 rounded border border-imperial-600'>
            <h4 className='font-semibold text-sm mb-2'>Ready to Play?</h4>
            <p className='text-xs text-imperial-300'>
              Make sure Battlefront II is running and you're ready to join matches quickly 
              when the coordination begins.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}