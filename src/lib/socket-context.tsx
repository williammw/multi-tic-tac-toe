// src/lib/socket-context.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
}

const SocketContext = createContext<SocketContextType>({ 
  socket: null, 
  connected: false,
  error: null
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Clean up any existing socket connection
    if (socket) {
      socket.disconnect();
    }

    // Determine the socket URL based on the environment
    const socketUrl = 
      import.meta.env.VITE_SOCKET_URL ||  
      'https://multi-tic-tac-toe-backend-31ac0fb8506a.herokuapp.com';
    
    console.log('Connecting to socket server at:', socketUrl);
    
    const connectSocket = async () => {
      try {
        let auth = {};
        
        // If user is authenticated, get the Firebase ID token
        if (user) {
          try {
            const token = await user.getIdToken();
            auth = { token };
            console.log('Connecting with authentication token');
          } catch (err) {
            console.error('Error getting auth token:', err);
            setError('Authentication error. Try refreshing the page.');
          }
        }
        
        // Create socket connection with auth token if available
        const socketConnection = io(socketUrl, { auth });
        setSocket(socketConnection);

        // Connection status logging
        socketConnection.on('connect', () => {
          console.log('Socket connected successfully');
          setConnected(true);
          setError(null);
        });
        
        socketConnection.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
          setConnected(false);
          setError(`Connection error: ${err.message}`);
        });
        
        socketConnection.on('error', (errMsg: string) => {
          console.error('Socket error:', errMsg);
          setError(errMsg);
        });

        return () => {
          socketConnection.disconnect();
          setConnected(false);
        };
      } catch (err) {
        console.error('Socket initialization error:', err);
        setError('Failed to initialize connection');
        return () => {};
      }
    };

    const cleanup = connectSocket();
    return () => {
      cleanup.then(cleanupFn => cleanupFn());
    };
  }, [user]); // Reconnect when user auth changes

  return (
    <SocketContext.Provider value={{ socket, connected, error }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocketContext = () => useContext(SocketContext);