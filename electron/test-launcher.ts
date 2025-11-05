import { BattleconnectGameLauncher } from './src/GameLauncher';

async function testGameLauncher() {
  console.log('🎮 Testing Battlefront II Auto-Launcher');
  console.log('=====================================');
  
  const launcher = new BattleconnectGameLauncher();
  
  // Set up event listeners
  launcher.on('gameStarted', (sessionId, platform) => {
    console.log(`✅ Game started on ${platform} (Session: ${sessionId})`);
  });
  
  launcher.on('gameExited', (sessionId, code, signal) => {
    console.log(`🔚 Game exited (Session: ${sessionId}, Code: ${code})`);
  });
  
  launcher.on('gameError', (sessionId, error) => {
    console.error(`💥 Game error (Session: ${sessionId}):`, error);
  });

  // Wait for initialization to complete
  console.log('\n⏳ Waiting for launcher initialization...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check available installations
  console.log('\n📁 Checking available installations...');
  let installations = launcher.getAvailableInstallations();
  
  if (installations.length === 0) {
    console.log('❌ No installations found. Refreshing detection...');
    installations = await launcher.refreshInstallations();
  }
  
  const validInstallations = installations.filter(inst => inst.valid);
  console.log(`\n🎯 Found ${validInstallations.length} valid installations:`);
  
  validInstallations.forEach((installation, index) => {
    console.log(`${index + 1}. ${installation.platform.toUpperCase()}`);
    console.log(`   📍 Path: ${installation.path}`);
    console.log(`   🎮 Executable: ${installation.executable}`);
  });

  if (validInstallations.length === 0) {
    console.log('❌ No valid installations available for launch test');
    return;
  }

  // Test automatic game launch
  console.log('\n🚀 Testing automatic game launch...');
  console.log('⚠️  WARNING: This will actually launch Battlefront II!');
  
  // Uncomment the line below to actually test launching
  // const result = await launcher.autoLaunchGame('test-session-1');
  
  console.log('🔒 Launch test disabled for safety');
  console.log('💡 To enable actual launching, uncomment the test line in test-launcher.ts');
  
  /*
  if (result.success) {
    console.log(`✅ Launch successful via ${result.platform}`);
    
    // Wait a moment, then stop the game (optional)
    console.log('\n⏳ Waiting 10 seconds before stopping...');
    setTimeout(async () => {
      await launcher.stopGame('test-session-1');
      console.log('🛑 Game stopped');
    }, 10000);
    
  } else {
    console.log(`❌ Launch failed: ${result.error}`);
  }
  */
  
  // Show session status
  const sessions = launcher.getActiveSessions();
  console.log(`\n📊 Active sessions: ${sessions.length}`);
  
  sessions.forEach(session => {
    console.log(`   📋 ${session.id}: ${session.status} (${session.installation.platform})`);
  });
  
  console.log('\n✅ Game launcher test completed!');
}

testGameLauncher().catch(console.error);