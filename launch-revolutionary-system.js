#!/usr/bin/env node

/**
 * 🚀 BATTLECONNECT REVOLUTIONARY LAUNCHER
 * 
 * This script demonstrates the revolutionary distributed multiplayer system:
 * 1. Auto-detects Battlefront II installations
 * 2. Launches games with multiplayer override
 * 3. Creates distributed network that survives host crashes
 * 4. Enables seamless reconnection with state sync
 */

console.log(`
🚀 ============================================
   BATTLECONNECT REVOLUTIONARY SYSTEM
   Distributed Multiplayer Infrastructure
============================================

⚡ REVOLUTIONARY FEATURES:
• Auto-detection of Battlefront II installations
• Automatic game launching with multiplayer override  
• Distributed network surviving host crashes
• Seamless reconnection with game state sync
• Cross-platform support (Steam/EA/Epic/PS Remote)

🎯 STARTING BATTLECONNECT...
`);

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Check if we're in the correct directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Please run this script from the Battleconnect root directory');
  process.exit(1);
}

console.log('📦 Installing dependencies...');

// Function to run npm install in a directory
async function installDependencies(dir, name) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Installing ${name} dependencies...`);
    
    const npm = spawn('npm', ['install'], {
      cwd: path.join(process.cwd(), dir),
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    npm.stdout.on('data', (data) => {
      output += data.toString();
    });

    npm.stderr.on('data', (data) => {
      output += data.toString();
    });

    npm.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${name} dependencies installed successfully`);
        resolve();
      } else {
        console.error(`❌ Failed to install ${name} dependencies`);
        console.error(output);
        reject(new Error(`Installation failed with code ${code}`));
      }
    });
  });
}

// Function to start a service
function startService(command, args, cwd, name, color = '\\x1b[36m') {
  console.log(`🚀 Starting ${name}...`);
  
  const service = spawn(command, args, {
    cwd: path.join(process.cwd(), cwd),
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false
  });

  service.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`${color}[${name}]\\x1b[0m ${output}`);
    }
  });

  service.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output && !output.includes('ExperimentalWarning')) {
      console.log(`${color}[${name}]\\x1b[0m ${output}`);
    }
  });

  service.on('close', (code) => {
    console.log(`💥 ${name} exited with code ${code}`);
  });

  return service;
}

async function main() {
  try {
    // Install all dependencies
    await installDependencies('.', 'Root');
    await installDependencies('backend', 'Backend');
    await installDependencies('frontend', 'Frontend');
    await installDependencies('electron', 'Electron');
    await installDependencies('voice', 'Voice');

    console.log(`
✅ All dependencies installed successfully!

🚀 LAUNCHING REVOLUTIONARY DISTRIBUTED SYSTEM...

🌐 Backend: WebSocket server with distributed game coordination
🎮 Frontend: React app with revolutionary auto-launch UI  
⚡ Electron: Native launcher with game detection & auto-launch
🎵 Voice: Real-time voice coordination for team matches
    `);

    // Start all services
    const backend = startService('npm', ['run', 'dev'], 'backend', 'Backend Server', '\\x1b[32m');
    
    // Wait a bit for backend to start
    setTimeout(() => {
      const frontend = startService('npm', ['run', 'dev'], 'frontend', 'Frontend App', '\\x1b[34m');
    }, 2000);

    // Wait a bit more for frontend
    setTimeout(() => {
      const electron = startService('npm', ['run', 'dev'], 'electron', 'Electron Launcher', '\\x1b[35m');
    }, 4000);

    // Wait for voice service
    setTimeout(() => {
      const voice = startService('npm', ['run', 'dev'], 'voice', 'Voice Service', '\\x1b[33m');
    }, 6000);

    console.log(`
🎯 BATTLECONNECT REVOLUTIONARY SYSTEM LAUNCHING...

📡 Backend Server: http://localhost:3001
🎮 Frontend App: http://localhost:3000  
⚡ Electron App: Native launcher window
🎵 Voice Service: Real-time coordination

🚀 REVOLUTIONARY FEATURES ACTIVE:
• Auto-detection of Battlefront II installations
• Distributed multiplayer network architecture
• Crash-resistant game hosting with auto-promotion
• Seamless reconnection with state synchronization
• Cross-platform game launch support

Ready to revolutionize Battlefront II multiplayer! 🌟
    `);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\\n🛑 Shutting down Battleconnect...');
      process.exit(0);
    });

  } catch (error) {
    console.error('💥 Failed to start Battleconnect:', error.message);
    process.exit(1);
  }
}

main();