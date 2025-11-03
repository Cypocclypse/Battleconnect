import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket(url?: string) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const serverUrl = url || (import.meta.env.VITE_API_URL || 'http://localhost:3001');

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setConnected(true);
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from server');
    });

    socket.on('connect_error', (error: any) => {
      console.error('Connection error:', error);
      setConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [url]);

  return {
    socket: socketRef.current,
    connected,
  };
}