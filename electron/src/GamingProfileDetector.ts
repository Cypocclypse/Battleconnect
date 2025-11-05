import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

interface UserProfile {
  platform: 'ea' | 'steam' | 'epic' | 'playstation' | 'unknown';
  username: string;
  displayName: string;
  userId?: string;
}

/**
 * REVOLUTIONARY: Gaming Profile Detector
 * 
 * Automatically detects the user's gaming platform usernames:
 * - EA App / Origin username
 * - Steam profile name
 * - Epic Games username  
 * - PlayStation Network ID (via PS Remote Play)
 * 
 * Uses this for chat display names and lobby identification
 */
export class GamingProfileDetector extends EventEmitter {
  private detectedProfiles: UserProfile[] = [];
  private primaryProfile: UserProfile | null = null;

  constructor() {
    super();
    this.detectAllProfiles();
  }

  /**
   * Detect usernames from all gaming platforms
   */
  private async detectAllProfiles(): Promise<void> {
    console.log('🕵️ DETECTIVE: Scanning for gaming platform usernames...');
    
    try {
      // Try to detect from each platform in parallel
      const detectionPromises = [
        this.detectEAProfile(),
        this.detectSteamProfile(),
        this.detectEpicProfile(),
        this.detectPlayStationProfile()
      ];

      const results = await Promise.allSettled(detectionPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          this.detectedProfiles.push(result.value);
        }
      });

      // Set primary profile (prefer EA since it's for Battlefront II)
      this.primaryProfile = this.detectedProfiles.find(p => p.platform === 'ea') || 
                           this.detectedProfiles[0] || 
                           { platform: 'unknown', username: 'Player', displayName: 'Anonymous Player' };

      console.log(`🎯 DETECTIVE: Found ${this.detectedProfiles.length} gaming profiles`);
      console.log(`👤 PRIMARY: ${this.primaryProfile.displayName} (${this.primaryProfile.platform.toUpperCase()})`);
      
      this.emit('profiles-detected', {
        profiles: this.detectedProfiles,
        primary: this.primaryProfile
      });

    } catch (error) {
      console.error('🚨 Profile detection failed:', error);
      this.primaryProfile = { platform: 'unknown', username: 'Player', displayName: 'Anonymous Player' };
    }
  }

  /**
   * Detect EA App / Origin username
   */
  private async detectEAProfile(): Promise<UserProfile | null> {
    try {
      // Check EA App registry entries
      const eaRegPaths = [
        'HKEY_CURRENT_USER\\Software\\Electronic Arts\\EA Desktop',
        'HKEY_CURRENT_USER\\Software\\Origin'
      ];

      for (const regPath of eaRegPaths) {
        try {
          const { stdout } = await execAsync(`reg query "${regPath}" /s 2>nul`);
          
          // Look for username patterns
          const userMatch = stdout.match(/UserName\s+REG_SZ\s+(.+)/i) ||
                           stdout.match(/user\s+REG_SZ\s+(.+)/i) ||
                           stdout.match(/email\s+REG_SZ\s+(.+)/i);
          
          if (userMatch) {
            const username = userMatch[1].trim();
            return {
              platform: 'ea',
              username,
              displayName: username.split('@')[0], // Remove email domain if present
              userId: username
            };
          }
        } catch (err) {
          // Continue to next path
        }
      }

      // Check EA App local files
      const eaConfigPaths = [
        path.join(process.env.APPDATA || '', 'Electronic Arts', 'EA Desktop', 'user.json'),
        path.join(process.env.LOCALAPPDATA || '', 'Origin', 'user.xml')
      ];

      for (const configPath of eaConfigPaths) {
        if (fs.existsSync(configPath)) {
          const content = fs.readFileSync(configPath, 'utf8');
          const usernameMatch = content.match(/"username":\s*"([^"]+)"/i) ||
                               content.match(/<username>([^<]+)<\/username>/i) ||
                               content.match(/"displayName":\s*"([^"]+)"/i);
          
          if (usernameMatch) {
            const username = usernameMatch[1];
            return {
              platform: 'ea',
              username,
              displayName: username,
              userId: username
            };
          }
        }
      }

    } catch (error) {
      console.log('EA profile detection failed:', error);
    }
    
    return null;
  }

  /**
   * Detect Steam username
   */
  private async detectSteamProfile(): Promise<UserProfile | null> {
    try {
      // Check Steam registry
      const { stdout } = await execAsync('reg query "HKEY_CURRENT_USER\\Software\\Valve\\Steam" /v AutoLoginUser 2>nul');
      const userMatch = stdout.match(/AutoLoginUser\s+REG_SZ\s+(.+)/i);
      
      if (userMatch) {
        const username = userMatch[1].trim();
        return {
          platform: 'steam',
          username,
          displayName: username,
          userId: username
        };
      }

      // Check Steam config files
      const steamConfigPath = path.join(process.env.PROGRAMFILES_X86 || 'C:\\Program Files (x86)', 'Steam', 'config', 'loginusers.vdf');
      
      if (fs.existsSync(steamConfigPath)) {
        const content = fs.readFileSync(steamConfigPath, 'utf8');
        const usernameMatch = content.match(/"AccountName"\s+"([^"]+)"/i) ||
                             content.match(/"PersonaName"\s+"([^"]+)"/i);
        
        if (usernameMatch) {
          return {
            platform: 'steam',
            username: usernameMatch[1],
            displayName: usernameMatch[1],
            userId: usernameMatch[1]
          };
        }
      }

    } catch (error) {
      console.log('Steam profile detection failed:', error);
    }
    
    return null;
  }

  /**
   * Detect Epic Games username
   */
  private async detectEpicProfile(): Promise<UserProfile | null> {
    try {
      const epicConfigPath = path.join(process.env.LOCALAPPDATA || '', 'EpicGamesLauncher', 'Saved', 'Config', 'Windows', 'GameUserSettings.ini');
      
      if (fs.existsSync(epicConfigPath)) {
        const content = fs.readFileSync(epicConfigPath, 'utf8');
        const usernameMatch = content.match(/LastConnectedAccountName=(.+)/i) ||
                             content.match(/DisplayName=(.+)/i);
        
        if (usernameMatch) {
          const username = usernameMatch[1].trim();
          return {
            platform: 'epic',
            username,
            displayName: username,
            userId: username
          };
        }
      }

      // Check Epic registry
      const { stdout } = await execAsync('reg query "HKEY_CURRENT_USER\\Software\\Epic Games\\Unreal Engine\\Identifiers" 2>nul');
      const userMatch = stdout.match(/AccountId\s+REG_SZ\s+(.+)/i);
      
      if (userMatch) {
        return {
          platform: 'epic',
          username: userMatch[1].trim(),
          displayName: userMatch[1].trim(),
          userId: userMatch[1].trim()
        };
      }

    } catch (error) {
      console.log('Epic Games profile detection failed:', error);
    }
    
    return null;
  }

  /**
   * Detect PlayStation Network profile (via PS Remote Play)
   */
  private async detectPlayStationProfile(): Promise<UserProfile | null> {
    try {
      // Check PS Remote Play registry/config
      const psRegPath = 'HKEY_CURRENT_USER\\Software\\Sony Interactive Entertainment\\PS Remote Play';
      
      const { stdout } = await execAsync(`reg query "${psRegPath}" 2>nul`);
      const userMatch = stdout.match(/UserId\s+REG_SZ\s+(.+)/i) ||
                       stdout.match(/AccountId\s+REG_SZ\s+(.+)/i);
      
      if (userMatch) {
        const userId = userMatch[1].trim();
        return {
          platform: 'playstation',
          username: userId,
          displayName: `PS_${userId}`,
          userId
        };
      }

    } catch (error) {
      console.log('PlayStation profile detection failed:', error);
    }
    
    return null;
  }

  /**
   * Get the primary gaming profile for display
   */
  getPrimaryProfile(): UserProfile {
    return this.primaryProfile || { platform: 'unknown', username: 'Player', displayName: 'Anonymous Player' };
  }

  /**
   * Get all detected profiles
   */
  getAllProfiles(): UserProfile[] {
    return this.detectedProfiles;
  }

  /**
   * Get profile for a specific platform
   */
  getProfileForPlatform(platform: string): UserProfile | null {
    return this.detectedProfiles.find(p => p.platform === platform) || null;
  }

  /**
   * Manual override for username (in case detection fails)
   */
  setManualProfile(username: string, platform: string = 'manual'): void {
    this.primaryProfile = {
      platform: platform as any,
      username,
      displayName: username,
      userId: username
    };
    
    console.log(`👤 MANUAL: Profile set to ${username}`);
    this.emit('profile-updated', this.primaryProfile);
  }
}