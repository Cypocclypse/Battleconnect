import { Socket } from 'socket.io-client';

interface GameSharingSession {
  sessionId: string;
  hostId: string;
  guestId: string;
  isActive: boolean;
}

interface InputEvent {
  type: 'keyboard' | 'mouse';
  event: KeyboardEvent | MouseEvent;
  timestamp: number;
}

export class GameInstanceSharing {
  private socket: Socket | null = null;
  private currentSession: GameSharingSession | null = null;
  private isHost: boolean = false;
  private isGuest: boolean = false;
  private inputCapture: boolean = false;
  private remoteDesktopConnection: RTCPeerConnection | null = null;

  constructor(socket: Socket) {
    this.socket = socket;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Host events
    this.socket.on('game-sharing-request', this.handleSharingRequest.bind(this));
    this.socket.on('guest-input', this.handleGuestInput.bind(this));
    
    // Guest events
    this.socket.on('game-sharing-accepted', this.handleSharingAccepted.bind(this));
    this.socket.on('game-sharing-rejected', this.handleSharingRejected.bind(this));
    this.socket.on('remote-desktop-offer', this.handleRemoteDesktopOffer.bind(this));
    
    // Common events
    this.socket.on('session-ended', this.handleSessionEnded.bind(this));
  }

  // HOST FUNCTIONS
  async startGameSharing(guestId: string): Promise<boolean> {
    if (!this.socket) return false;

    try {
      this.isHost = true;
      
      // Set up screen capture for the game window specifically
      const gameStream = await this.captureGameWindow();
      if (!gameStream) {
        throw new Error('Could not capture Battlefront II window');
      }

      // Create WebRTC connection for remote desktop sharing
      this.remoteDesktopConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add game stream
      gameStream.getTracks().forEach(track => {
        this.remoteDesktopConnection!.addTrack(track, gameStream);
      });

      // Handle ICE candidates
      this.remoteDesktopConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit('ice-candidate', {
            candidate: event.candidate,
            sessionId: this.currentSession?.sessionId
          });
        }
      };

      // Create offer
      const offer = await this.remoteDesktopConnection.createOffer();
      await this.remoteDesktopConnection.setLocalDescription(offer);

      // Send offer to guest
      this.socket.emit('remote-desktop-offer', {
        guestId,
        offer,
        sessionId: this.currentSession?.sessionId
      });

      // Enable input forwarding from guest
      this.enableInputForwarding();

      return true;
    } catch (error) {
      console.error('Failed to start game sharing:', error);
      return false;
    }
  }

  private async captureGameWindow(): Promise<MediaStream | null> {
    try {
      // Use Electron's desktopCapturer to get Battlefront II window specifically
      if (window.electronAPI && 'getDesktopSources' in window.electronAPI) {
        const electronAPI = window.electronAPI as any;
        const sources = await electronAPI.getDesktopSources();
        const battlefrontSource = sources.find(source => 
          source.name.toLowerCase().includes('battlefront') ||
          source.name.toLowerCase().includes('starwars')
        );

        if (battlefrontSource) {
          return await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: battlefrontSource.id,
                minWidth: 1920,
                maxWidth: 1920,
                minHeight: 1080,
                maxHeight: 1080,
                minFrameRate: 30,
                maxFrameRate: 60
              }
            } as any
          });
        }
      }

      // Fallback to screen capture
      return await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });
    } catch (error) {
      console.error('Failed to capture game window:', error);
      return null;
    }
  }

  private enableInputForwarding(): void {
    this.inputCapture = true;
    // Input forwarding will be handled through socket events
  }

  private handleGuestInput(data: { input: InputEvent }): void {
    if (!this.isHost || !this.inputCapture) return;

    // Forward input to the game window
    this.forwardInputToGame(data.input);
  }

  private forwardInputToGame(inputEvent: InputEvent): void {
    // This would integrate with native APIs to send input to Battlefront II
    // For now, we'll simulate the approach
    
    if (inputEvent.type === 'keyboard') {
      // Use Electron's native APIs to send keyboard input to game window
      if (window.electronAPI && 'sendKeyboardInput' in window.electronAPI) {
        (window.electronAPI as any).sendKeyboardInput(inputEvent.event as KeyboardEvent);
      }
    } else if (inputEvent.type === 'mouse') {
      // Use Electron's native APIs to send mouse input to game window
      if (window.electronAPI && 'sendMouseInput' in window.electronAPI) {
        (window.electronAPI as any).sendMouseInput(inputEvent.event as MouseEvent);
      }
    }
  }

  // GUEST FUNCTIONS
  async requestGameSharing(hostId: string): Promise<void> {
    if (!this.socket) return;

    this.socket.emit('request-game-sharing', {
      hostId,
      guestId: this.socket.id
    });
  }

  private async handleRemoteDesktopOffer(data: { offer: RTCSessionDescriptionInit }): Promise<void> {
    if (!this.socket) return;

    try {
      this.isGuest = true;

      // Create peer connection
      this.remoteDesktopConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Handle incoming stream
      this.remoteDesktopConnection.ontrack = (event) => {
        this.displayRemoteGame(event.streams[0]);
      };

      // Handle ICE candidates
      this.remoteDesktopConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket!.emit('ice-candidate', {
            candidate: event.candidate,
            sessionId: this.currentSession?.sessionId
          });
        }
      };

      // Set remote description and create answer
      await this.remoteDesktopConnection.setRemoteDescription(data.offer);
      const answer = await this.remoteDesktopConnection.createAnswer();
      await this.remoteDesktopConnection.setLocalDescription(answer);

      // Send answer
      this.socket.emit('remote-desktop-answer', {
        answer,
        sessionId: this.currentSession?.sessionId
      });

      // Enable input capture for forwarding
      this.enableInputCapture();

    } catch (error) {
      console.error('Failed to handle remote desktop offer:', error);
    }
  }

  private displayRemoteGame(stream: MediaStream): void {
    // Create fullscreen game display
    let gameContainer = document.getElementById('remote-game-container');
    if (!gameContainer) {
      const container = document.createElement('div');
      container.id = 'remote-game-container';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: black;
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
      `;
      document.body.appendChild(container);
      gameContainer = container;
    }

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
    `;

    const existingVideo = document.getElementById('remote-game-video');
    if (existingVideo) {
      existingVideo.remove();
    }

    video.id = 'remote-game-video';
    gameContainer.appendChild(video);

    // Add exit button
    const exitButton = document.createElement('button');
    exitButton.textContent = 'Exit Game Sharing (ESC)';
    exitButton.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      padding: 10px 15px;
      background: rgba(0,0,0,0.8);
      color: white;
      border: 1px solid #fff;
      border-radius: 5px;
      cursor: pointer;
    `;
    exitButton.onclick = () => this.endGameSharing();
    gameContainer.appendChild(exitButton);
  }

  private enableInputCapture(): void {
    const gameVideo = document.getElementById('remote-game-video');
    if (!gameVideo) return;

    // Capture keyboard input
    document.addEventListener('keydown', this.handleKeyInput.bind(this));
    document.addEventListener('keyup', this.handleKeyInput.bind(this));

    // Capture mouse input
    gameVideo.addEventListener('mousemove', this.handleMouseInput.bind(this));
    gameVideo.addEventListener('mousedown', this.handleMouseInput.bind(this));
    gameVideo.addEventListener('mouseup', this.handleMouseInput.bind(this));
    gameVideo.addEventListener('click', this.handleMouseInput.bind(this));

    // Request pointer lock for better control
    gameVideo.addEventListener('click', () => {
      gameVideo.requestPointerLock();
    });
  }

  private handleKeyInput(event: KeyboardEvent): void {
    if (!this.isGuest || !this.socket) return;

    // Prevent default browser actions
    event.preventDefault();

    // Send input to host
    this.socket.emit('guest-input', {
      input: {
        type: 'keyboard',
        event: {
          type: event.type,
          key: event.key,
          keyCode: event.keyCode,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey
        },
        timestamp: Date.now()
      }
    });
  }

  private handleMouseInput(event: MouseEvent): void {
    if (!this.isGuest || !this.socket) return;

    event.preventDefault();

    this.socket.emit('guest-input', {
      input: {
        type: 'mouse',
        event: {
          type: event.type,
          clientX: event.clientX,
          clientY: event.clientY,
          button: event.button,
          buttons: event.buttons
        },
        timestamp: Date.now()
      }
    });
  }

  // COMMON FUNCTIONS
  endGameSharing(): void {
    if (this.remoteDesktopConnection) {
      this.remoteDesktopConnection.close();
      this.remoteDesktopConnection = null;
    }

    if (this.isGuest) {
      const gameContainer = document.getElementById('remote-game-container');
      if (gameContainer) {
        gameContainer.remove();
      }

      // Remove event listeners
      document.removeEventListener('keydown', this.handleKeyInput.bind(this));
      document.removeEventListener('keyup', this.handleKeyInput.bind(this));
      
      // Exit pointer lock
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }

    if (this.socket) {
      this.socket.emit('end-game-sharing', {
        sessionId: this.currentSession?.sessionId
      });
    }

    this.currentSession = null;
    this.isHost = false;
    this.isGuest = false;
    this.inputCapture = false;
  }

  private handleSharingRequest(data: { guestId: string, guestName: string }): void {
    // Show confirmation dialog to host
    const accept = confirm(`${data.guestName} wants to share your Battlefront II game. Accept?`);
    
    if (accept) {
      this.startGameSharing(data.guestId);
    } else {
      this.socket?.emit('game-sharing-rejected', {
        guestId: data.guestId,
        reason: 'Host declined'
      });
    }
  }

  private handleSharingAccepted(): void {
    console.log('Game sharing request accepted!');
  }

  private handleSharingRejected(data: { reason: string }): void {
    alert(`Game sharing request rejected: ${data.reason}`);
  }

  private handleSessionEnded(): void {
    this.endGameSharing();
  }
}