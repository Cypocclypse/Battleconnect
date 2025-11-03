import { desktopCapturer, DesktopCapturerSource } from 'electron';

export interface CaptureSource {
  id: string;
  name: string;
  thumbnail: string;
  display_id?: string;
  appIcon?: string;
}

export class DesktopCapture {
  private currentStream: MediaStream | null = null;
  private capturing = false;

  async getSources(): Promise<CaptureSource[]> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 300, height: 200 },
      });

      return sources.map((source: DesktopCapturerSource) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        display_id: source.display_id,
        appIcon: source.appIcon?.toDataURL(),
      }));
    } catch (error) {
      console.error('Failed to get desktop sources:', error);
      return [];
    }
  }

  async startCapture(sourceId: string): Promise<boolean> {
    try {
      if (this.capturing) {
        this.stopCapture();
      }

      // Get the media stream from the selected source
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-ignore - Electron specific constraint
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
          },
        },
      });

      this.currentStream = stream;
      this.capturing = true;

      console.log(`Desktop capture started for source: ${sourceId}`);
      return true;
    } catch (error) {
      console.error('Failed to start desktop capture:', error);
      this.capturing = false;
      return false;
    }
  }

  stopCapture(): boolean {
    if (!this.capturing || !this.currentStream) {
      return true;
    }

    try {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
      this.capturing = false;

      console.log('Desktop capture stopped');
      return true;
    } catch (error) {
      console.error('Failed to stop desktop capture:', error);
      return false;
    }
  }

  getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  isCapturing(): boolean {
    return this.capturing;
  }

  // Create a video element for display (helper method)
  createVideoElement(): HTMLVideoElement | null {
    if (!this.currentStream) {
      return null;
    }

    const video = document.createElement('video');
    video.srcObject = this.currentStream;
    video.autoplay = true;
    video.muted = true; // Always mute to avoid feedback
    
    return video;
  }

  // Get capture statistics
  getCaptureStats(): any {
    if (!this.currentStream) {
      return null;
    }

    const videoTrack = this.currentStream.getVideoTracks()[0];
    if (!videoTrack) {
      return null;
    }

    try {
      return {
        label: videoTrack.label,
        enabled: videoTrack.enabled,
        muted: videoTrack.muted,
        readyState: videoTrack.readyState,
        settings: videoTrack.getSettings(),
        constraints: videoTrack.getConstraints(),
        capabilities: videoTrack.getCapabilities(),
      };
    } catch (error) {
      console.error('Failed to get capture stats:', error);
      return null;
    }
  }

  // Screen recording functionality (future enhancement)
  async startRecording(options?: {
    mimeType?: string;
    videoBitsPerSecond?: number;
  }): Promise<MediaRecorder | null> {
    if (!this.currentStream) {
      console.error('No active capture stream for recording');
      return null;
    }

    try {
      const defaultOptions = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      };

      const recordingOptions = { ...defaultOptions, ...options };

      const recorder = new MediaRecorder(this.currentStream, recordingOptions);
      
      console.log('Screen recording started');
      return recorder;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return null;
    }
  }
}