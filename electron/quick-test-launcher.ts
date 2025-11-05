import { BattleconnectGameLauncher } from './src/GameLauncher';

async function quickTest() {
  console.log('🚀 Quick Game Launcher Test');
  
  const launcher = new BattleconnectGameLauncher();
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('🎯 Testing auto-launch...');
  const result = await launcher.autoLaunchGame('test-session-1');
  
  console.log('📊 Launch Result:', result);
  
  if (result.success) {
    console.log('✅ GAME LAUNCHED SUCCESSFULLY!');
    
    // Stop after 3 seconds for testing
    setTimeout(() => {
      launcher.stopGame('test-session-1');
      console.log('🛑 Test completed - game stopped');
      process.exit(0);
    }, 3000);
  } else {
    console.log('❌ Launch failed:', result.error);
    process.exit(1);
  }
}

quickTest().catch(console.error);