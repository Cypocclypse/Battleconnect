import React, { useState, useRef, useEffect } from 'react';

export const DesktopCapture: React.FC = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startDesktopCapture = async () => {
    try {
      setError(null);
      
      // Request desktop capture with high quality
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 }
        },
        audio: false // We don't need audio for desktop viewing
      });

      setStream(displayStream);
      setIsCapturing(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = displayStream;
      }

      // Handle stream end (user stops sharing)
      displayStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopDesktopCapture();
      });
      
    } catch (error) {
      console.error('Error starting desktop capture:', error);
      setError('Failed to capture desktop. Please grant screen sharing permission.');
    }
  };

  const stopDesktopCapture = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    // Auto-start desktop capture immediately
    startDesktopCapture();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (error) {
    return (
      <div className='w-full h-full flex items-center justify-center'>
        <div className='text-center'>
          <div className='mb-4' style={{fontSize: '3rem'}}>⚠️</div>
          <h3 className='text-lg font-bold text-white mb-2'>Desktop Capture Error</h3>
          <p className='text-red-400 mb-4'>{error}</p>
          <button
            onClick={startDesktopCapture}
            className='px-6 py-2 rounded text-white font-semibold'
            style={{backgroundColor: '#f97316'}}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!isCapturing) {
    return (
      <div className='w-full h-full bg-black flex items-center justify-center'>
        <div className='text-center'>
          <h3 className='text-lg text-white mb-2'>Click to share your desktop</h3>
          <button
            onClick={startDesktopCapture}
            className='px-6 py-3 rounded text-white font-bold text-lg'
            style={{backgroundColor: '#f97316'}}
          >
            SHOW MY SCREEN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full h-full relative bg-black rounded overflow-hidden'>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className='w-full h-full object-contain'
        style={{maxHeight: '100%', maxWidth: '100%'}}
      />
      
      {/* Control overlay */}
      <div className='absolute top-2 right-2 flex space-x-2'>
        <button
          onClick={stopDesktopCapture}
          className='px-3 py-1 rounded text-white text-sm'
          style={{backgroundColor: 'rgba(220, 38, 38, 0.8)'}}
        >
          Stop Sharing
        </button>
        <button
          onClick={startDesktopCapture}
          className='px-3 py-1 rounded text-white text-sm'
          style={{backgroundColor: 'rgba(249, 115, 22, 0.8)'}}
        >
          Restart
        </button>
      </div>
      
      {/* Status indicator */}
      <div className='absolute bottom-2 left-2 flex items-center space-x-2 px-2 py-1 rounded' style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
        <div className='w-2 h-2 rounded-full bg-green-500 animate-pulse' />
        <span className='text-xs text-white'>Live Desktop</span>
      </div>
    </div>
  );
};