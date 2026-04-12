'use client';

/**
 * Socket.io Client Hook — useSocket
 *
 * Provides a React hook for connecting to the Socket.io server,
 * joining rooms, emitting events, and subscribing to events.
 *
 * Usage:
 *   const { connected, on, emit, joinRoom } = useSocket(token);
 *   useEffect(() => {
 *     joinRoom(`business:${businessId}`);
 *     return on('submission.approved', (data) => { ... });
 *   }, [joinRoom, on, businessId]);
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// Socket.io-client is an optional dependency
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Socket = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let socketIO: ((...args: any[]) => Socket) | null = null;
try {
  // eslint-disable-next-line no-eval
  socketIO = eval('require')('socket.io-client').io;
} catch {
  // socket.io-client not installed
}

interface UseSocketOptions {
  /** Auto-reconnect on disconnect (default: true) */
  reconnection?: boolean;
  /** Initial reconnection delay in ms (default: 1000) */
  reconnectionDelay?: number;
  /** Max reconnection delay in ms (default: 30000) */
  reconnectionDelayMax?: number;
  /** Preferred transports (default: ['websocket', 'polling']) */
  transports?: ('websocket' | 'polling')[];
}

interface UseSocketReturn {
  /** Whether the socket is currently connected */
  connected: boolean;
  /** Subscribe to an event. Returns an unsubscribe function. */
  on: (event: string, handler: (...args: unknown[]) => void) => () => void;
  /** Emit an event with data */
  emit: (event: string, data: unknown) => void;
  /** Join a room (e.g. 'business:abc-123') */
  joinRoom: (room: string) => void;
  /** Leave a room */
  leaveRoom: (room: string) => void;
  /** The raw Socket.io instance (for advanced usage) */
  socket: Socket | null;
}

export function useSocket(
  token?: string,
  options: UseSocketOptions = {},
): UseSocketReturn {
  const {
    reconnection = true,
    reconnectionDelay = 1000,
    reconnectionDelayMax = 30000,
    transports = ['websocket', 'polling'],
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token || !socketIO) return;

    const socket = socketIO({
      path: '/api/socket',
      auth: { token },
      transports,
      reconnection,
      reconnectionDelay,
      reconnectionDelayMax,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (err: Error) => {
      console.warn('[Socket.io] Connection error:', err.message);
      setConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, reconnection, reconnectionDelay, reconnectionDelayMax, transports]);

  const on = useCallback(
    (event: string, handler: (...args: unknown[]) => void): (() => void) => {
      const socket = socketRef.current;
      if (!socket) return () => {};

      socket.on(event, handler);
      return () => {
        socket.off(event, handler);
      };
    },
    [],
  );

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  const joinRoom = useCallback((room: string) => {
    socketRef.current?.emit('join', room);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    socketRef.current?.emit('leave', room);
  }, []);

  return {
    connected,
    on,
    emit,
    joinRoom,
    leaveRoom,
    socket: socketRef.current,
  };
}
