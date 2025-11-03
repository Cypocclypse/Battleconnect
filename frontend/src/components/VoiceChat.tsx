import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { VoicePeer } from '../types';

interface VoiceChatProps {
  socket: Socket | null;
}

export function VoiceChat({ socket }: VoiceChatProps) {
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [peers, setPeers] = useState<VoicePeer[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerConnections] = useState(new Map<string, RTCPeerConnection>());

  useEffect(() => {
    if (!socket) return;

    socket.on('voice-peer-joined', (peer: VoicePeer) => {
      setPeers((prev: VoicePeer[]) => [...prev.filter(p => p.id !== peer.id), peer]);
    });

    socket.on('voice-peer-left', (peerId: string) => {
      setPeers((prev: VoicePeer[]) => prev.filter(p => p.id !== peerId));
      peerConnections.get(peerId)?.close();
      peerConnections.delete(peerId);
    });

    socket.on('voice-offer', async ({ from, offer }: any) => {
      await handleOffer(from, offer);
    });

    socket.on('voice-answer', async ({ from, answer }: any) => {
      const pc = peerConnections.get(from);
      if (pc) {
        await pc.setRemoteDescription(answer);
      }
    });

    socket.on('voice-ice-candidate', async ({ from, candidate }: any) => {
      const pc = peerConnections.get(from);
      if (pc) {
        await pc.addIceCandidate(candidate);
      }
    });

    return () => {
      socket.off('voice-peer-joined');
      socket.off('voice-peer-left');
      socket.off('voice-offer');
      socket.off('voice-answer');
      socket.off('voice-ice-candidate');
    };
  }, [socket]);

  const createPeerConnection = (peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // TURN servers would be configured via environment variables
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('voice-ice-candidate', {
          to: peerId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      // Handle remote audio stream
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.play();
    };

      if (localStream) {
        localStream.getTracks().forEach((track: any) => {
          pc.addTrack(track, localStream);
        });
      }    peerConnections.set(peerId, pc);
    return pc;
  };

  const handleOffer = async (from: string, offer: RTCSessionDescriptionInit) => {
    const pc = createPeerConnection(from);
    await pc.setRemoteDescription(offer);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (socket) {
      socket.emit('voice-answer', {
        to: from,
        answer,
      });
    }
  };

  const connectVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      setLocalStream(stream);
      setConnected(true);

      if (socket) {
        socket.emit('voice-join');
      }

      // Create peer connections for existing peers
      peers.forEach((peer: VoicePeer) => {
        createPeerConnection(peer.id);
      });

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const disconnectVoice = () => {
    if (localStream) {
      localStream.getTracks().forEach((track: any) => track.stop());
      setLocalStream(null);
    }

    peerConnections.forEach((pc: any) => pc.close());
    peerConnections.clear();

    setConnected(false);
    setPeers([]);

    if (socket) {
      socket.emit('voice-leave');
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMuted(!audioTrack.enabled);
      }
    }
  };

  return (
    <div className='panel h-64'>
      <div className='panel-header'>
        <div className='flex items-center justify-between'>
          <h2>Voice Chat</h2>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-500'}`} />
        </div>
      </div>
      <div className='panel-content flex flex-col h-full'>
        {!connected ? (
          <div className='flex-1 flex items-center justify-center'>
            <div className='text-center'>
              <div className='w-12 h-12 mx-auto mb-3 rounded-full bg-imperial-700 flex items-center justify-center'>
                <svg className='w-6 h-6 text-imperial-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' />
                </svg>
              </div>
              <p className='text-sm text-imperial-300 mb-4'>Connect to voice chat</p>
              <button onClick={connectVoice} className='btn-primary'>
                Join Voice
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className='flex-1 space-y-2 overflow-y-auto'>
              {peers.length === 0 ? (
                <p className='text-sm text-imperial-300 text-center py-4'>
                  No other players in voice chat
                </p>
              ) : (
                peers.map(peer => (
                  <div key={peer.id} className='flex items-center justify-between bg-imperial-700 p-2 rounded'>
                    <div className='flex items-center space-x-2'>
                      <div className={`w-2 h-2 rounded-full ${peer.speaking ? 'bg-green-500' : 'bg-gray-500'}`} />
                      <span className='text-sm'>{peer.username}</span>
                    </div>
                    {peer.muted && (
                      <svg className='w-4 h-4 text-red-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z' />
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2' />
                      </svg>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className='flex space-x-2 pt-3 border-t border-imperial-600'>
              <button
                onClick={toggleMute}
                className={`flex-1 py-2 px-3 rounded text-sm font-semibold ${
                  muted ? 'bg-red-600 hover:bg-red-700' : 'bg-imperial-600 hover:bg-imperial-500'
                }`}
              >
                {muted ? 'Unmute' : 'Mute'}
              </button>
              <button onClick={disconnectVoice} className='btn-danger text-sm'>
                Leave
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}