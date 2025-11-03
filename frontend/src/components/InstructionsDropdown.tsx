interface InstructionsDropdownProps {
  onClose: () => void;
}

export function InstructionsDropdown({ onClose }: InstructionsDropdownProps) {
  return (
    <div className='absolute top-16 right-6 z-50 w-96 bg-imperial-800 border border-imperial-600 rounded-lg shadow-xl'>
      <div className='flex items-center justify-between p-4 border-b border-imperial-600'>
        <h3 className='font-orbitron font-bold text-lg'>How to Use Battleconnect</h3>
        <button onClick={onClose} className='text-imperial-400 hover:text-white'>
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
          </svg>
        </button>
      </div>
      
      <div className='p-4 space-y-4 max-h-96 overflow-y-auto'>
        <div>
          <h4 className='font-semibold text-rebel-400 mb-2'>1. Launch Battlefront II</h4>
          <p className='text-sm text-imperial-300'>
            Start Star Wars Battlefront II on your system through EA App, Steam, Epic Games, 
            or PlayStation Remote Play. The system will detect it automatically, or you can 
            confirm manually.
          </p>
        </div>

        <div>
          <h4 className='font-semibold text-rebel-400 mb-2'>2. Join or Create a Lobby</h4>
          <p className='text-sm text-imperial-300'>
            Once your game is detected, create a new lobby or join an existing one. 
            Choose your match type (Galactic Assault, Supremacy, etc.) and wait for other players.
          </p>
        </div>

        <div>
          <h4 className='font-semibold text-rebel-400 mb-2'>3. Team Assignment</h4>
          <p className='text-sm text-imperial-300'>
            Factions are randomized (Republic vs Separatists, Rebels vs Empire, etc.) 
            and players are auto-assigned to teams. AI will fill remaining slots.
          </p>
        </div>

        <div>
          <h4 className='font-semibold text-rebel-400 mb-2'>4. Voice Chat & Coordination</h4>
          <p className='text-sm text-imperial-300'>
            Use the built-in voice chat and persistent text chat to coordinate with your team. 
            Voice chat uses WebRTC with fallback servers for reliable connection.
          </p>
        </div>

        <div>
          <h4 className='font-semibold text-rebel-400 mb-2'>5. Match Synchronization</h4>
          <p className='text-sm text-imperial-300'>
            When the host starts the match, everyone gets synchronized instructions. 
            Launch into the same server and follow the team assignments for coordinated gameplay.
          </p>
        </div>

        <div>
          <h4 className='font-semibold text-rebel-400 mb-2'>6. Post-Match</h4>
          <p className='text-sm text-imperial-300'>
            After the match ends, the lobby dissolves automatically. You can create or join 
            new lobbies for additional matches.
          </p>
        </div>

        <div className='bg-imperial-700 p-3 rounded'>
          <h4 className='font-semibold text-yellow-400 mb-2'>Important Notes</h4>
          <ul className='text-sm text-imperial-300 space-y-1'>
            <li>• No mods or game modification required</li>
            <li>• Works with any legitimate copy of Battlefront II</li>
            <li>• Browser version has full functionality</li>
            <li>• Electron shell provides enhanced game detection</li>
            <li>• All communication is encrypted and secure</li>
          </ul>
        </div>

        <div className='bg-red-600/20 border border-red-600 p-3 rounded'>
          <h4 className='font-semibold text-red-400 mb-2'>Troubleshooting</h4>
          <ul className='text-sm text-imperial-300 space-y-1'>
            <li>• Game not detected? Use manual confirmation</li>
            <li>• Voice chat issues? Check microphone permissions</li>
            <li>• Connection problems? Refresh and reconnect</li>
            <li>• Match sync issues? Ensure game is running</li>
          </ul>
        </div>
      </div>
    </div>
  );
}