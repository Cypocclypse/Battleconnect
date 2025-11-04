import { useState } from 'react';

interface GameDetectionProps {
  onGameConfirmed: (hasGame: boolean) => void;
}

export function GameDetection({ onGameConfirmed }: GameDetectionProps) {
  const [showManualConfirm, setShowManualConfirm] = useState(false);

  const handleManualConfirm = () => {
    onGameConfirmed(true);
  };

  return (
    <div className='panel'>
      <div className='panel-header'>
        <h2>Game Detection</h2>
      </div>
      <div className='panel-content'>
        <div className='space-y-4'>
          <div className='text-center'>
            <div className='w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center' style={{backgroundColor: '#343a40'}}>
              <svg className='w-8 h-8' style={{color: '#f97316'}} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
              </svg>
            </div>
            <h3 className='text-lg font-bold mb-2'>Battlefront II Status</h3>
            <p className='text-sm mb-4' style={{color: '#ced4da'}}>
              Set your game ownership status
            </p>
          </div>

          {/* Game Ownership Checkboxes */}
          <div className='space-y-4'>
            <div className='p-3 rounded border' style={{backgroundColor: '#212529', borderColor: '#495057'}}>
              <label className='flex items-center space-x-3 cursor-pointer'>
                <input 
                  type='checkbox' 
                  className='w-4 h-4 rounded'
                  style={{accentColor: '#f97316'}}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onGameConfirmed(true); // Has game
                    }
                  }}
                />
                <div>
                  <div className='font-semibold text-white'>I have Battlefront II</div>
                  <div className='text-sm' style={{color: '#ced4da'}}>Launch game and join rooms directly</div>
                </div>
              </label>
            </div>
            
            <div className='p-3 rounded border' style={{backgroundColor: '#212529', borderColor: '#495057'}}>
              <label className='flex items-center space-x-3 cursor-pointer'>
                <input 
                  type='checkbox' 
                  className='w-4 h-4 rounded'
                  style={{accentColor: '#f97316'}}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onGameConfirmed(false); // Doesn't have game - needs hosting
                    }
                  }}
                />
                <div>
                  <div className='font-semibold text-white'>I don't have Battlefront II</div>
                  <div className='text-sm' style={{color: '#ced4da'}}>Request hosting from other players</div>
                </div>
              </label>
            </div>
          </div>

          <div className='space-y-2 text-xs' style={{color: '#6c757d'}}>
            <p className='font-semibold'>Supported Platforms:</p>
            <div className='grid grid-cols-2 gap-1'>
              <span>• EA App / Origin</span>
              <span>• Steam</span>
              <span>• Epic Games Store</span>
              <span>• PS Remote Play</span>
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