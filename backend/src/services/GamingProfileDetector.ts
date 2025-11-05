import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

interface GamingProfile {
  platform: 'ea' | 'steam' | 'epic' | 'playstation' | 'xbox';
  username: string;
  displayName: string;
}

/**
 * REVOLUTIONARY: Gaming Profile Detector
 * 
 * Automatically detects usernames from installed gaming platforms:
 * - EA App / Origin accounts
 * - Steam profiles  
 * - Epic Games accounts
 * - PlayStation Network (via PS Remote Play)
 * - Xbox Live accounts
 */
export class GamingProfileDetector {
  private profiles: GamingProfile[] = [];

  constructor() {
    this.detectAllProfiles();
  }

  /**
   * Detect gaming profiles from all platforms
   */
  private async detectAllProfiles(): Promise<void> {
    console.log('🔍 GAMING: Detecting platform usernames...');

    // Run all detections in parallel
    await Promise.allSettled([
      this.detectEAProfile(),
      this.detectSteamProfile(),
      this.detectEpicProfile(),
      this.detectPlayStationProfile(),
      this.detectXboxProfile()
    ]);

    console.log(`🎮 Found ${this.profiles.length} gaming profiles:`);
    this.profiles.forEach(profile => {
      console.log(`   ${profile.platform.toUpperCase()}: ${profile.displayName}`);
    });
  }

  /**
   * Detect EA App / Origin username
   */
  private async detectEAProfile(): Promise<void> {
    try {
      // Check EA App local data
      const eaDataPath = path.join(os.homedir(), 'AppData', 'Local', 'Electronic Arts', 'EA Desktop');
      const originDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Origin');
      
      // EA Desktop newer format
      try {
        const eaConfigPath = path.join(eaDataPath, 'user.json');
        const eaData = await fs.readFile(eaConfigPath, 'utf8');
        const eaConfig = JSON.parse(eaData);
        
        if (eaConfig.username || eaConfig.displayName) {
          this.profiles.push({
            platform: 'ea',
            username: eaConfig.username || eaConfig.displayName,
            displayName: eaConfig.displayName || eaConfig.username
          });
          return;
        }
      } catch (error) {
        // EA Desktop not found, try Origin
      }

      // Origin legacy format
      try {
        const originConfigPath = path.join(originDataPath, 'local.xml');
        const originData = await fs.readFile(originConfigPath, 'utf8');
        
        // Parse XML for username
        const usernameMatch = originData.match(/<string key="user.email">([^<]+)<\/string>/);
        const displayMatch = originData.match(/<string key="user.displayname">([^<]+)<\/string>/);
        
        if (usernameMatch || displayMatch) {
          this.profiles.push({
            platform: 'ea',
            username: usernameMatch?.[1] || displayMatch?.[1] || 'Unknown',
            displayName: displayMatch?.[1] || usernameMatch?.[1] || 'EA User'
          });
        }
      } catch (error) {
        // Origin not found
      }

    } catch (error) {
      console.log('   EA profile not detected');
    }
  }

  /**
   * Detect Steam username
   */
  private async detectSteamProfile(): Promise<void> {
    try {
      // Check Steam config
      const steamPath = path.join('C:', 'Program Files (x86)', 'Steam', 'config', 'loginusers.vdf');
      const steamData = await fs.readFile(steamPath, 'utf8');
      
      // Parse VDF format for most recent user
      const usernameMatch = steamData.match(/"PersonaName"\s+"([^"]+)"/);
      const accountMatch = steamData.match(/"AccountName"\s+"([^"]+)"/);
      
      if (usernameMatch || accountMatch) {
        this.profiles.push({
          platform: 'steam',
          username: accountMatch?.[1] || usernameMatch?.[1] || 'Unknown',
          displayName: usernameMatch?.[1] || accountMatch?.[1] || 'Steam User'
        });
      }
    } catch (error) {
      console.log('   Steam profile not detected');
    }
  }

  /**
   * Detect Epic Games username
   */
  private async detectEpicProfile(): Promise<void> {
    try {
      const epicPath = path.join(os.homedir(), 'AppData', 'Local', 'EpicGamesLauncher', 'Saved', 'Config', 'Windows', 'GameUserSettings.ini');
      const epicData = await fs.readFile(epicPath, 'utf8');
      
      // Parse INI format
      const usernameMatch = epicData.match(/LastUserName=([^\r\n]+)/);
      
      if (usernameMatch) {
        this.profiles.push({
          platform: 'epic',
          username: usernameMatch[1],
          displayName: usernameMatch[1]
        });
      }
    } catch (error) {
      console.log('   Epic Games profile not detected');
    }
  }

  /**
   * Detect PlayStation profile (via PS Remote Play)
   */
  private async detectPlayStationProfile(): Promise<void> {
    try {
      const psPath = path.join(os.homedir(), 'AppData', 'Roaming', 'PlayStation Remote Play');
      
      // Check if PS Remote Play is installed
      const exists = await fs.access(psPath).then(() => true).catch(() => false);
      
      if (exists) {
        // Try to find saved profile data
        const configFiles = await fs.readdir(psPath);
        const userFile = configFiles.find(file => file.includes('user') || file.includes('profile'));
        
        if (userFile) {
          // This would need more specific parsing based on PS Remote Play's actual format
          this.profiles.push({
            platform: 'playstation',
            username: 'PSN User',
            displayName: 'PlayStation User'
          });
        }
      }
    } catch (error) {
      console.log('   PlayStation profile not detected');
    }
  }

  /**
   * Detect Xbox profile
   */
  private async detectXboxProfile(): Promise<void> {
    try {
      // Check Windows account integration with Xbox
      const { stdout } = await execAsync('powershell "Get-AppxPackage *Xbox*"');
      
      if (stdout.includes('Microsoft.XboxApp') || stdout.includes('Microsoft.GamingApp')) {
        // Xbox app is installed, could potentially detect gamertag
        this.profiles.push({
          platform: 'xbox',
          username: 'Xbox User',
          displayName: 'Xbox Gamer'
        });
      }
    } catch (error) {
      console.log('   Xbox profile not detected');
    }
  }

  /**
   * Get the best gaming profile to use as default
   */
  getBestProfile(): GamingProfile | null {
    // Priority: EA (for Battlefront) > Steam > Epic > PlayStation > Xbox
    const priorities = ['ea', 'steam', 'epic', 'playstation', 'xbox'];
    
    for (const platform of priorities) {
      const profile = this.profiles.find(p => p.platform === platform);
      if (profile) return profile;
    }
    
    return null;
  }

  /**
   * Get all detected profiles
   */
  getAllProfiles(): GamingProfile[] {
    return this.profiles;
  }

  /**
   * Get display name for chat
   */
  getDisplayNameForChat(): string {
    const bestProfile = this.getBestProfile();
    
    if (bestProfile) {
      return `${bestProfile.displayName}`;
    }
    
    // Fallback to system username
    return os.userInfo().username;
  }

  /**
   * Get platform-specific display name
   */
  getPlatformDisplayName(): string {
    const bestProfile = this.getBestProfile();
    
    if (bestProfile) {
      const platformEmoji = {
        ea: '🎮',
        steam: '⭐',
        epic: '🚀', 
        playstation: '🎯',
        xbox: '🎪'
      };
      
      return `${platformEmoji[bestProfile.platform]} ${bestProfile.displayName}`;
    }
    
    return `💻 ${os.userInfo().username}`;
  }
}