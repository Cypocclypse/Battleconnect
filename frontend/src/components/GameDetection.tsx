import { useState } from 'react';

interface GameDetectionProps {
  onGameConfirmed: () => void;
}

export function GameDetection({ onGameConfirmed }: GameDetectionProps) {
  const [showManualConfirm, setShowManualConfirm] = useState(false);

  const handleManualConfirm = () => {
    onGameConfirmed();
  };

  return (
    <div className='panel'>
      <div className='panel-header'>
        <h2>Game Detection</h2>
      </div>
      <div className='panel-content'>
        <div className='space-y-4'>
          <div className='text-center'>
            <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-imperial-700 flex items-center justify-center'>
              <svg className='w-8 h-8 text-rebel-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
              </svg>
            </div>
            <h3 className='text-lg font-orbitron mb-2'>Scanning for Battlefront II</h3>
            <p className='text-imperial-300 text-sm mb-4'>
              Launch Star Wars Battlefront II on your system
            </p>
          </div>

          <div className='space-y-2 text-sm text-imperial-400'>
            <div className='flex items-center space-x-2'>
              <div className='w-2 h-2 rounded-full bg-imperial-500'></div>
              <span>EA App / Origin</span>
            </div>
            <div className='flex items-center space-x-2'>
              <div className='w-2 h-2 rounded-full bg-imperial-500'></div>
              <span>Steam</span>
            </div>
            <div className='flex items-center space-x-2'>
              <div className='w-2 h-2 rounded-full bg-imperial-500'></div>
              <span>Epic Games Store</span>
            </div>
            <div className='flex items-center space-x-2'>
              <div className='w-2 h-2 rounded-full bg-imperial-500'></div>
              <span>PlayStation Remote Play</span>
            </div>
          </div>

          <div className='pt-4 border-t border-imperial-600'>
            <button
              onClick={() => setShowManualConfirm(true)}
              className='btn-secondary w-full mb-2'
            >
              Manual Confirmation
            </button>
            <p className='text-xs text-imperial-400 text-center'>
              Game not detected automatically? Click above to confirm manually.
            </p>
          </div>

          {showManualConfirm && (
            <div className='bg-imperial-700 p-4 rounded border border-imperial-600'>
              <h4 className='font-semibold mb-2'>Confirm Game Status</h4>
              <p className='text-sm text-imperial-300 mb-4'>
                Is Star Wars Battlefront II currently running on your system?
              </p>
              <div className='flex space-x-2'>
                <button onClick={handleManualConfirm} className='btn-primary flex-1'>
                  Yes, Game is Running
                </button>
                <button 
                  onClick={() => setShowManualConfirm(false)}
                  className='btn-secondary flex-1'
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}