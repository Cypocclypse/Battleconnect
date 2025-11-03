import React, { useState, useEffect, useRef } from 'react';

interface ScreenStreamingProps {
  isHost: boolean;
  isGuest: boolean;
  sessionId?: string;
  socket: any;
}

export const ScreenStreaming: React.FC<ScreenStreamingProps> = ({
  isHost,
  isGuest,
  sessionId,
  socket,
}) => {
  const [streaming, setStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    if (!socket || !sessionId) return;

    // Host-specific events
    if (isHost) {
      socket.on('stream-request', handleStreamRequest);
      socket.on('stream-ice-candidate', handleIceCandidate);
      socket.on('stream-answer', handleAnswer);
    }

    // Guest-specific events  
    if (isGuest) {
      socket.on('stream-offer', handleOffer);
      socket.on('stream-ice-candidate', handleIceCandidate);
      socket.on('stream-started', handleStreamStarted);
    }

    return () => {
      socket.off('stream-request');
      socket.off('stream-offer');
      socket.off('stream-answer');
      socket.off('stream-ice-candidate');
      socket.off('stream-started');
    };
  }, [socket, sessionId, isHost, isGuest]);

  const startStreaming = async () => {
    if (!isHost) return;

    try {
      // Get screen capture (this would integrate with DesktopCapture)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setStreaming(true);

      // Set up WebRTC peer connection
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add stream tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('stream-ice-candidate', {
            sessionId,
            candidate: event.candidate
          });
        }
      };

      // Notify that streaming is ready
      socket.emit('stream-ready', { sessionId });

    } catch (error) {
      console.error('Failed to start streaming:', error);
      alert('Failed to start screen sharing. Please ensure you grant permission.');
    }
  };

  const stopStreaming = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStreaming(false);

    if (socket) {
      socket.emit('stream-ended', { sessionId });
    }
  };

  const requestStream = () => {
    if (!isGuest || !socket) return;

    socket.emit('stream-request', { sessionId });
  };

  const handleStreamRequest = async () => {
    if (!isHost || !peerConnectionRef.current || !socket) return;

    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      socket.emit('stream-offer', {
        sessionId,
        offer
      });
    } catch (error) {
      console.error('Failed to create offer:', error);
    }
  };

  const handleOffer = async (data: { offer: RTCSessionDescriptionInit }) => {
    if (!isGuest || !socket) return;

    try {
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Handle incoming stream
      peerConnection.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('stream-ice-candidate', {
            sessionId,
            candidate: event.candidate
          });
        }
      };

      await peerConnection.setRemoteDescription(data.offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('stream-answer', {
        sessionId,
        answer
      });

    } catch (error) {
      console.error('Failed to handle offer:', error);
    }
  };

  const handleAnswer = async (data: { answer: RTCSessionDescriptionInit }) => {
    if (!isHost || !peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(data.answer);
    } catch (error) {
      console.error('Failed to handle answer:', error);
    }
  };

  const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.addIceCandidate(data.candidate);
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  };

  const handleStreamStarted = () => {
    setStreaming(true);
  };

  if (!isHost && !isGuest) {
    return null;
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-blue-600">
      <h4 className="text-lg font-semibold text-blue-400 mb-3 flex items-center">
        <span className="mr-2">📺</span>
        {isHost ? 'Screen Sharing (Host)' : 'Game View (Guest)'}
      </h4>

      {isHost && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Share your Battlefront screen</span>
            <button
              onClick={streaming ? stopStreaming : startStreaming}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                streaming
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {streaming ? 'Stop Sharing' : 'Start Sharing'}
            </button>
          </div>

          {streaming && (
            <div className="bg-blue-900 rounded p-3 border border-blue-600">
              <p className="text-blue-200 text-sm">
                ✓ Your screen is being shared with the guest player
              </p>
              <p className="text-blue-300 text-xs mt-1">
                Make sure Battlefront II is visible on your screen
              </p>
            </div>
          )}

          {/* Host preview */}
          <div className="bg-black rounded overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full h-32 object-contain"
              style={{ backgroundColor: '#000' }}
            />
            <div className="p-2 bg-gray-800">
              <p className="text-gray-400 text-xs text-center">
                Preview of shared screen
              </p>
            </div>
          </div>
        </div>
      )}

      {isGuest && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">View host's Battlefront game</span>
            {!streaming && (
              <button
                onClick={requestStream}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
              >
                Request Stream
              </button>
            )}
          </div>

          {/* Guest view */}
          <div className="bg-black rounded overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              className="w-full h-64 object-contain cursor-pointer"
              style={{ backgroundColor: '#000' }}
              onClick={() => {
                // Toggle fullscreen
                if (videoRef.current) {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    videoRef.current.requestFullscreen();
                  }
                }
              }}
            />
            <div className="p-2 bg-gray-800">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-xs">
                  {streaming ? 'Connected to host\'s game' : 'Waiting for stream...'}
                </p>
                {streaming && (
                  <p className="text-green-400 text-xs">
                    Click video to fullscreen
                  </p>
                )}
              </div>
            </div>
          </div>

          {!streaming && (
            <div className="bg-gray-800 rounded p-3">
              <p className="text-gray-300 text-sm">
                Request the host to start screen sharing so you can see their Battlefront game.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};