// src/lib/socket-context.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Determine the socket URL based on the environment
    const socketUrl = 
      import.meta.env.VITE_SOCKET_URL || 
      'https://multi-tic-tac-toe-backend-31ac0fb8506a.herokuapp.com';
    
    console.log('Connecting to socket server at:', socketUrl);
    
    const socketConnection = io(socketUrl);
    setSocket(socketConnection);

    // Connection status logging
    socketConnection.on('connect', () => {
      console.log('Socket connected successfully');
    });
    
    socketConnection.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocketContext = () => useContext(SocketContext);