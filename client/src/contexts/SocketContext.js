import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  const socketRef = useRef(null);
  const userIdRef = useRef(null);

  useEffect(() => {
    // Only reconnect if user.id actually changes (not on every user object update)
    const userId = user?.id;
    const userRole = user?.role;

    if (userId && userId !== userIdRef.current) {
      userIdRef.current = userId;

      // Close existing socket if any
      if (socketRef.current) {
        socketRef.current.close();
      }

      // Create socket connection
      const newSocket = io(process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000'), {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('🔌 Connected to server');
        setIsConnected(true);
        
        // Join appropriate room based on user role
        if (userRole === 'teacher' || userRole === 'admin') {
          newSocket.emit('join-teacher-room', userId);
        } else if (userRole === 'student') {
          newSocket.emit('join-student-room', userId);
        }
      });

      newSocket.on('disconnect', () => {
        console.log('🔌 Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('🔌 Connection error:', error);
        setIsConnected(false);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
        }
      };
    } else if (!userId && socketRef.current) {
      // Disconnect socket if user logs out
      socketRef.current.close();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      userIdRef.current = null;
    }
    // Note: No dependencies on socket to prevent reconnection loop
  }, [user?.id, user?.role]);

  const value = {
    socket,
    isConnected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
