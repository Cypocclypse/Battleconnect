export interface VoiceConfig {
  iceServers: RTCIceServer[];
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}

export interface VoicePeer {
  id: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
  muted: boolean;
  speaking: boolean;
}

export class VoiceManager {
  private localStream: MediaStream | null = null;
  private peers = new Map<string, VoicePeer>();
  private config: VoiceConfig;
  private reconnectAttempts = new Map<string, number>();

  constructor(config?: Partial<VoiceConfig>) {
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // TURN servers should be added via environment configuration
      ],
      autoReconnect: true,
      maxReconnectAttempts: 3,
      reconnectDelay: 2000,
      ...config,
    };
  }

  async initializeLocalStream(): Promise<MediaStream> {
    try {
      if (this.localStream) {
        return this.localStream;
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 44100,
        },
      });

      console.log('Local audio stream initialized');
      return this.localStream;
    } catch (error) {
      console.error('Failed to access microphone:', error);
      throw new Error('Microphone access denied or not available');
    }
  }

  async createPeerConnection(
    peerId: string,
    onIceCandidate?: (candidate: RTCIceCandidate) => void,
    onRemoteStream?: (stream: MediaStream) => void
  ): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({
      iceServers: this.config.iceServers,
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && onIceCandidate) {
        onIceCandidate(event.candidate);
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream && onRemoteStream) {
        onRemoteStream(remoteStream);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Peer ${peerId} connection state: ${pc.connectionState}`);
      
      if (pc.connectionState === 'failed' && this.config.autoReconnect) {
        this.handleReconnection(peerId);
      }
    };

    // Add local stream tracks if available
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Store peer connection
    this.peers.set(peerId, {
      id: peerId,
      connection: pc,
      muted: false,
      speaking: false,
    });

    console.log(`Peer connection created for ${peerId}`);
    return pc;
  }

  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }

    const offer = await peer.connection.createOffer();
    await peer.connection.setLocalDescription(offer);
    
    console.log(`Offer created for peer ${peerId}`);
    return offer;
  }

  async handleOffer(
    peerId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }

    await peer.connection.setRemoteDescription(offer);
    const answer = await peer.connection.createAnswer();
    await peer.connection.setLocalDescription(answer);

    console.log(`Answer created for peer ${peerId}`);
    return answer;
  }

  async handleAnswer(
    peerId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }

    await peer.connection.setRemoteDescription(answer);
    console.log(`Answer processed for peer ${peerId}`);
  }

  async handleIceCandidate(
    peerId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }

    await peer.connection.addIceCandidate(candidate);
    console.log(`ICE candidate added for peer ${peerId}`);
  }

  muteMicrophone(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = false;
        console.log('Microphone muted');
      }
    }
  }

  unmuteMicrophone(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        console.log('Microphone unmuted');
      }
    }
  }

  isMuted(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      return audioTrack ? !audioTrack.enabled : true;
    }
    return true;
  }

  removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.connection.close();
      this.peers.delete(peerId);
      this.reconnectAttempts.delete(peerId);
      console.log(`Peer ${peerId} removed`);
    }
  }

  closeAllConnections(): void {
    for (const [peerId, peer] of this.peers) {
      peer.connection.close();
      console.log(`Closed connection to peer ${peerId}`);
    }
    this.peers.clear();
    this.reconnectAttempts.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      console.log('Local stream stopped');
    }
  }

  getPeers(): VoicePeer[] {
    return Array.from(this.peers.values());
  }

  getPeer(peerId: string): VoicePeer | undefined {
    return this.peers.get(peerId);
  }

  getConnectionStats(): Promise<RTCStatsReport>[] {
    return Array.from(this.peers.values()).map(peer => 
      peer.connection.getStats()
    );
  }

  private async handleReconnection(peerId: string): Promise<void> {
    if (!this.config.autoReconnect) return;

    const attempts = this.reconnectAttempts.get(peerId) || 0;
    if (attempts >= this.config.maxReconnectAttempts) {
      console.log(`Max reconnection attempts reached for peer ${peerId}`);
      this.removePeer(peerId);
      return;
    }

    console.log(`Attempting to reconnect to peer ${peerId} (attempt ${attempts + 1})`);
    this.reconnectAttempts.set(peerId, attempts + 1);

    // Wait before reconnecting
    setTimeout(async () => {
      try {
        // The actual reconnection logic would depend on the signaling implementation
        // This is a placeholder for the reconnection process
        console.log(`Reconnection attempt for peer ${peerId} would happen here`);
      } catch (error) {
        console.error(`Reconnection failed for peer ${peerId}:`, error);
      }
    }, this.config.reconnectDelay);
  }

  // Audio level detection (for speaking indicator)
  enableSpeakingDetection(callback: (speaking: boolean) => void): void {
    if (!this.localStream) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(this.localStream);
    const analyser = audioContext.createAnalyser();
    
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let isSpeaking = false;
    const speakingThreshold = 30; // Adjust as needed
    const speakingDelay = 500; // ms
    let speakingTimer: NodeJS.Timeout | null = null;

    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      if (average > speakingThreshold) {
        if (!isSpeaking) {
          isSpeaking = true;
          callback(true);
        }
        
        if (speakingTimer) {
          clearTimeout(speakingTimer);
        }
        
        speakingTimer = setTimeout(() => {
          isSpeaking = false;
          callback(false);
        }, speakingDelay);
      }

      requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();
  }
}