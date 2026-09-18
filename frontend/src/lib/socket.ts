'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:10000';

let socketInstance: Socket | null = null;
let currentToken: string | null = null;

export function getSocket(token: string): Socket {
  if (!socketInstance || currentToken !== token) {
    if (socketInstance) {
      socketInstance.disconnect();
    }
    currentToken = token;
    socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  } else if (!socketInstance.connected && socketInstance.disconnected) {
    socketInstance.connect();
  }
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

/**
 * Hook to use Socket.IO in a component.
 * Automatically connects with the user's token.
 */
export function useSocket(token: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;
    socketRef.current = getSocket(token);

    return () => {
      // Don't disconnect on unmount — keep singleton alive
    };
  }, [token]);

  const emit = useCallback(
    (event: string, data?: object) => {
      socketRef.current?.emit(event, data);
    },
    []
  );

  const on = useCallback(
    (event: string, handler: (...args: any[]) => void) => {
      socketRef.current?.on(event, handler);
      return () => { socketRef.current?.off(event, handler); };
    },
    []
  );

  return { socket: socketRef.current, emit, on };
}
