import { useState, useEffect, useRef, useCallback } from 'react';
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

  const sendMessage = useCallback((event: string, data?: any) => {
    if (socketRef.current && connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot send message:', event);
    }
  }, [connected]);

  return {
    socket: socketRef.current,
    connected,
    sendMessage,
  };
}