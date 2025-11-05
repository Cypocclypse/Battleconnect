@echo off
cd /d "%~dp0"
echo Starting Battleconnect Electron from: %CD%
set NODE_ENV=development
npx electron .
pause