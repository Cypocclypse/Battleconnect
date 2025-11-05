import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

interface GamingProfile {
  username: string;
  platform: 'ea' | 'steam' | 'epic' | 'playstation' | 'unknown';
  profilePath?: string;
}

/**
 * REVOLUTIONARY: Backend Gaming Profile Detector for Browser Users
 * 
 * Detects gaming usernames from various platforms on the server machine
 * so browser users can automatically use their real gaming usernames
 */
export class BackendProfileDetector extends EventEmitter {
  private detectedProfile: GamingProfile | null = null;

  constructor() {
    super();
  }

  /**
   * Detect gaming username from server-side gaming platforms
   */
  async detectGamingUsername(): Promise<GamingProfile> {
    console.log('🔍 BACKEND: Detecting gaming username from server platforms...');

    // Check for manual override first
    const manualUsername = process.env.BATTLECONNECT_USERNAME;
    if (manualUsername && manualUsername.trim().length > 0) {
      console.log(`✅ BACKEND: Using manual username override: ${manualUsername}`);
      return {
        username: manualUsername.trim(),
        platform: 'ea',
        profilePath: 'Manual Override'
      };
    }

    // Try EA App/Origin first (most likely for Battlefront II)
    console.log('🔍 BACKEND: Checking EA App/Origin...');
    let profile = await this.detectEAUsername();
    console.log(`🔍 BACKEND: EA result: ${profile.username} (${profile.platform})`);
    if (profile.username !== 'Unknown') return profile;

    // Try Steam
    console.log('🔍 BACKEND: Checking Steam...');
    profile = await this.detectSteamUsername();
    console.log(`🔍 BACKEND: Steam result: ${profile.username} (${profile.platform})`);
    if (profile.username !== 'Unknown') return profile;

    // Try Epic Games
    console.log('🔍 BACKEND: Checking Epic Games...');
    profile = await this.detectEpicUsername();
    console.log(`🔍 BACKEND: Epic result: ${profile.username} (${profile.platform})`);
    if (profile.username !== 'Unknown') return profile;

    // Fallback to system username
    console.log('🔍 BACKEND: No gaming username found, using system username');
    return {
      username: os.userInfo().username || 'Player',
      platform: 'unknown'
    };
  }

  /**
   * Detect EA App/Origin username
   */
  private async detectEAUsername(): Promise<GamingProfile> {
    try {
      const possiblePaths = [
        path.join(os.homedir(), 'AppData', 'Roaming', 'Origin'),
        path.join(os.homedir(), 'AppData', 'Local', 'EA Desktop'),
        path.join(os.homedir(), 'AppData', 'Local', 'EA Desktop', 'user'),
        path.join(os.homedir(), 'AppData', 'Roaming', 'EA Desktop'),
        path.join(os.homedir(), 'Documents', 'EA Games'),
        path.join('C:', 'ProgramData', 'Origin'),
        path.join('C:', 'ProgramData', 'EA Desktop')
      ];

      console.log('🔍 BACKEND: Checking EA paths:', possiblePaths);

      for (const basePath of possiblePaths) {
        try {
          console.log(`🔍 BACKEND: Checking path: ${basePath}`);
          if (fs.existsSync(basePath)) {
            console.log(`✅ BACKEND: Path exists: ${basePath}`);
            // Look for config files with username
            const files = fs.readdirSync(basePath, { recursive: true });
            console.log(`🔍 BACKEND: Found ${files.length} files in ${basePath}`);
            
            for (const file of files) {
              const filePath = path.join(basePath, file.toString());
              
              if (file.toString().includes('.ini') || file.toString().includes('.cfg') || file.toString().includes('.json') || file.toString().includes('.dat')) {
                try {
                  console.log(`🔍 BACKEND: Reading config file: ${filePath}`);
                  const content = fs.readFileSync(filePath, 'utf8');
                  
                  // Look for username patterns
                  const patterns = [
                    /UserName[=:]\s*"?([^"\r\n]+)"?/i,
                    /DisplayName[=:]\s*"?([^"\r\n]+)"?/i,
                    /AccountName[=:]\s*"?([^"\r\n]+)"?/i,
                    /"username"[:\s]*"([^"]+)"/i,
                    /"displayName"[:\s]*"([^"]+)"/i,
                    /user_name[=:]\s*"?([^"\r\n]+)"?/i
                  ];
                  
                  for (const pattern of patterns) {
                    const match = content.match(pattern);
                    if (match && match[1] && match[1].trim().length > 0) {
                      const username = match[1].trim();
                      if (!username.includes('\\') && !username.includes('/')) {
                        console.log(`✅ BACKEND: Found EA username: ${username}`);
                        return {
                          username,
                          platform: 'ea',
                          profilePath: filePath
                        };
                      }
                    }
                  }
                } catch (err) {
                  // File might be binary or locked, continue
                }
              }
            }
          }
        } catch (err) {
          // Continue to next path
        }
      }
      // Try EA Desktop user cache
      const eaDesktopUserPath = path.join(os.homedir(), 'AppData', 'Local', 'EA Desktop', 'user.dat');
      if (fs.existsSync(eaDesktopUserPath)) {
        try {
          console.log(`🔍 BACKEND: Checking EA Desktop user cache: ${eaDesktopUserPath}`);
          const userData = fs.readFileSync(eaDesktopUserPath, 'utf8');
          const userMatch = userData.match(/"displayName"[:\s]*"([^"]+)"/i);
          if (userMatch && userMatch[1]) {
            console.log(`✅ BACKEND: Found EA Desktop username: ${userMatch[1]}`);
            return {
              username: userMatch[1],
              platform: 'ea',
              profilePath: eaDesktopUserPath
            };
          }
        } catch (err) {
          console.log('🔍 BACKEND: Could not read EA Desktop user cache');
        }
      }

      // Try Windows Registry for EA/Origin username
      try {
        console.log('🔍 BACKEND: Checking Windows Registry for EA username...');
        const { stdout } = await execAsync('reg query "HKEY_CURRENT_USER\\Software\\EA\\EA Desktop" /v "UserName" 2>nul');
        const regMatch = stdout.match(/UserName\s+REG_SZ\s+(.+)/i);
        if (regMatch && regMatch[1]) {
          const username = regMatch[1].trim();
          console.log(`✅ BACKEND: Found EA username in registry: ${username}`);
          return {
            username,
            platform: 'ea',
            profilePath: 'Registry'
          };
        }
      } catch (err) {
        console.log('🔍 BACKEND: Registry check failed, continuing...');
      }

      // Try Origin registry as fallback
      try {
        console.log('🔍 BACKEND: Checking Origin registry...');
        const { stdout } = await execAsync('reg query "HKEY_CURRENT_USER\\Software\\Origin" /v "UserDisplayName" 2>nul');
        const regMatch = stdout.match(/UserDisplayName\s+REG_SZ\s+(.+)/i);
        if (regMatch && regMatch[1]) {
          const username = regMatch[1].trim();
          console.log(`✅ BACKEND: Found Origin username in registry: ${username}`);
          return {
            username,
            platform: 'ea',
            profilePath: 'Origin Registry'
          };
        }
      } catch (err) {
        console.log('🔍 BACKEND: Origin registry check failed, continuing...');
      }

    } catch (error) {
      console.log('🔍 BACKEND: EA username detection failed:', error);
    }

    console.log('🔍 BACKEND: No EA username found, returning Unknown');
    console.log('💡 BACKEND: If you know your EA username, you can set it manually in the code');
    return { username: 'Unknown', platform: 'ea' };
  }

  /**
   * Detect Steam username
   */
  private async detectSteamUsername(): Promise<GamingProfile> {
    try {
      const steamPath = path.join('C:', 'Program Files (x86)', 'Steam');
      const configPath = path.join(steamPath, 'config', 'loginusers.vdf');
      
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        
        // Look for PersonaName in Steam config
        const match = content.match(/"PersonaName"\s+"([^"]+)"/);
        if (match && match[1]) {
          const username = match[1];
          console.log(`✅ BACKEND: Found Steam username: ${username}`);
          return {
            username,
            platform: 'steam',
            profilePath: configPath
          };
        }
      }
    } catch (error) {
      console.log('🔍 BACKEND: Steam username detection failed:', error);
    }

    return { username: 'Unknown', platform: 'steam' };
  }

  /**
   * Detect Epic Games username  
   */
  private async detectEpicUsername(): Promise<GamingProfile> {
    try {
      const epicPath = path.join(os.homedir(), 'AppData', 'Local', 'EpicGamesLauncher', 'Saved', 'Config');
      
      if (fs.existsSync(epicPath)) {
        const files = fs.readdirSync(epicPath, { recursive: true });
        
        for (const file of files) {
          if (file.toString().includes('.ini') || file.toString().includes('.json')) {
            try {
              const filePath = path.join(epicPath, file.toString());
              const content = fs.readFileSync(filePath, 'utf8');
              
              const patterns = [
                /"DisplayName"[:\s]*"([^"]+)"/i,
                /"Username"[:\s]*"([^"]+)"/i,
                /DisplayName[=:]\s*"?([^"\r\n]+)"?/i
              ];
              
              for (const pattern of patterns) {
                const match = content.match(pattern);
                if (match && match[1] && match[1].trim().length > 0) {
                  const username = match[1].trim();
                  console.log(`✅ BACKEND: Found Epic username: ${username}`);
                  return {
                    username,
                    platform: 'epic',
                    profilePath: filePath
                  };
                }
              }
            } catch (err) {
              // Continue
            }
          }
        }
      }
    } catch (error) {
      console.log('🔍 BACKEND: Epic username detection failed:', error);
    }

    return { username: 'Unknown', platform: 'epic' };
  }

  /**
   * Get cached profile
   */
  getDetectedProfile(): GamingProfile | null {
    return this.detectedProfile;
  }

  /**
   * Force refresh profile detection
   */
  async refreshProfile(): Promise<GamingProfile> {
    this.detectedProfile = await this.detectGamingUsername();
    this.emit('profile-detected', this.detectedProfile);
    return this.detectedProfile;
  }
}