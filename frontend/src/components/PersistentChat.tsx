import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { ChatMessage } from '../types';

interface PersistentChatProps {
  socket: Socket | null;
}

export function PersistentChat({ socket }: PersistentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [username] = useState(localStorage.getItem('battleconnect-username') || 'Anonymous');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    socket.on('chat-message', (message: ChatMessage) => {
      setMessages((prev: ChatMessage[]) => [...prev, message]);
    });

    socket.on('chat-history', (history: ChatMessage[]) => {
      setMessages(history);
    });

    socket.on('user-joined-chat', (message: ChatMessage) => {
      setMessages((prev: ChatMessage[]) => [...prev, message]);
    });

    socket.on('user-left-chat', (message: ChatMessage) => {
      setMessages((prev: ChatMessage[]) => [...prev, message]);
    });

    // Request chat history when component mounts
    socket.emit('get-chat-history');

    return () => {
      socket.off('chat-message');
      socket.off('chat-history');
      socket.off('user-joined-chat');
      socket.off('user-left-chat');
    };
  }, [socket]);

  const sendMessage = () => {
    if (!socket || !newMessage.trim()) return;

    const sanitizedMessage = newMessage.trim().slice(0, 500); // Sanitize input

    socket.emit('send-chat-message', {
      message: sanitizedMessage,
      username,
    });

    setNewMessage('');
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className='panel flex-1'>
      <div className='panel-header'>
        <h2>Global Chat</h2>
      </div>
      <div className='panel-content flex flex-col h-full p-0'>
        {/* Messages Area */}
        <div className='flex-1 overflow-y-auto p-4 space-y-2 max-h-64'>
          {messages.length === 0 ? (
            <div className='text-center text-imperial-300 py-8'>
              <p className='text-sm'>No messages yet.</p>
              <p className='text-xs mt-1'>Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`text-sm ${
                  message.type === 'system' 
                    ? 'text-imperial-400 italic text-center' 
                    : 'text-white'
                }`}
              >
                {message.type === 'user' ? (
                  <div className='break-words'>
                    <span className='text-xs text-imperial-400 mr-2'>
                      {formatTime(message.timestamp)}
                    </span>
                    <span className='font-semibold text-rebel-400 mr-1'>
                      {message.username}:
                    </span>
                    <span>{message.message}</span>
                  </div>
                ) : (
                  <div className='py-1'>
                    <span className='text-xs text-imperial-500 mr-2'>
                      {formatTime(message.timestamp)}
                    </span>
                    {message.message}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className='border-t border-imperial-600 p-4'>
          <div className='flex space-x-2'>
            <input
              type='text'
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder='Type a message...'
              className='input-field flex-1'
              maxLength={500}
              disabled={!socket}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || !socket}
              className='btn-primary px-4'
            >
              Send
            </button>
          </div>
          <div className='flex justify-between items-center mt-2 text-xs text-imperial-400'>
            <span>Press Enter to send</span>
            <span>{newMessage.length}/500</span>
          </div>
        </div>
      </div>
    </div>
  );
}