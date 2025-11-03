#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Setting up Battleconnect workspace...');

const workspaces = [
  { name: 'Root', path: '.' },
  { name: 'Frontend', path: 'frontend' },
  { name: 'Backend', path: 'backend' },
  { name: 'Voice', path: 'voice' },
  { name: 'Electron', path: 'electron' }
];

function runCommand(command, cwd = process.cwd()) {
  try {
    console.log(`\n📦 Installing dependencies in ${path.basename(cwd)}...`);
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      env: { ...process.env, npm_config_legacy_peer_deps: 'true' }
    });
    console.log(`✅ ${path.basename(cwd)} setup complete`);
  } catch (error) {
    console.error(`❌ Error in ${path.basename(cwd)}:`, error.message);
    process.exit(1);
  }
}

function setupWorkspace() {
  // Install dependencies for each workspace
  workspaces.forEach(workspace => {
    const workspacePath = path.join(process.cwd(), workspace.path);
    
    try {
      // Check if package.json exists
      const fs = require('fs');
      if (fs.existsSync(path.join(workspacePath, 'package.json'))) {
        runCommand('npm install', workspacePath);
      } else {
        console.log(`⏭️  Skipping ${workspace.name} (no package.json)`);
      }
    } catch (error) {
      console.log(`⚠️  ${workspace.name} setup failed:`, error.message);
    }
  });

  console.log('\n🎉 Battleconnect workspace setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. npm run dev              # Start development servers');
  console.log('2. npm run build            # Build for production');
  console.log('3. npm run deploy           # Deploy to Render');
  console.log('\n📖 See DEPLOYMENT.md for deployment instructions');
}

if (require.main === module) {
  setupWorkspace();
}

module.exports = { setupWorkspace };