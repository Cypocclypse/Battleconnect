import { GameDetector } from './src/GameDetector';

async function testGameDetection() {
  console.log('🎮 Testing Battlefront II Detection System');
  console.log('==========================================');
  
  const detector = new GameDetector();
  
  // Wait for initial scan to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const installations = detector.getInstallations();
  console.log(`\n📁 Found ${installations.length} potential installations:`);
  
  installations.forEach((installation, index) => {
    console.log(`\n${index + 1}. ${installation.platform.toUpperCase()} Installation`);
    console.log(`   📍 Path: ${installation.path}`);
    console.log(`   🎯 Executable: ${installation.executable}`);
    console.log(`   ✅ Valid: ${installation.valid ? 'Yes' : 'No'}`);
  });
  
  const best = detector.getBestInstallation();
  if (best) {
    console.log(`\n🏆 Best Installation: ${best.platform.toUpperCase()}`);
    console.log(`   📍 Path: ${best.path}`);
  } else {
    console.log('\n❌ No valid installations found');
  }
  
  console.log('\n🔍 Comprehensive Platform Detection:');
  console.log('   🎮 Steam: Multiple library locations, registry detection');
  console.log('   🛠️  EA App/Origin: Official EA launcher installations');
  console.log('   🎯 Epic Games: Epic Games Store installations');
  console.log('   🎮 PlayStation: Remote Play (connects to PS4/PS5)');
  console.log('   📦 Xbox Game Pass: Windows Store installations');
  console.log('   💿 Custom: User-defined installation paths');
  
  // Test running detection
  console.log('\n🔄 Starting monitoring for running game...');
  detector.startMonitoring();
  
  detector.on('gameDetected', (detected, platform) => {
    console.log(`\n🎮 Game ${detected ? 'detected' : 'lost'} on ${platform}`);
  });
  
  detector.on('installationsFound', (installations) => {
    console.log(`\n📦 Installations updated: ${installations.length} found`);
  });
  
  const status = detector.getCurrentStatus();
  console.log('\n📊 Current Status:');
  console.log(`   🎯 Detected: ${status.detected}`);
  console.log(`   ▶️ Running: ${status.running}`);
  console.log(`   🏷️ Platform: ${status.platform}`);
  console.log(`   📁 Installations: ${status.installations.length}`);
  
  // Keep running for a bit to test monitoring
  setTimeout(() => {
    detector.stopMonitoring();
    console.log('\n✅ Detection test completed!');
    process.exit(0);
  }, 5000);
}

testGameDetection().catch(console.error);