/**
 * Socket.io Server — WebSocket real-time layer
 *
 * Integrates with Next.js via a custom HTTP server.
 * Provides room-based event broadcasting scoped by business.
 *
 * Usage:
 *   import { initSocketServer, broadcastEvent } from '@/lib/realtime/socket-server';
 *   // In server bootstrap:
 *   initSocketServer(httpServer);
 *   // In API routes:
 *   broadcastEvent(`business:${businessId}`, 'submission.approved', data);
 */

// Socket.io is an optional dependency — gracefully no-op when not installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SocketIOServer = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HTTPServer = any;

let io: SocketIOServer | null = null;

// Try to load socket.io at module level
let SocketIOServerClass: { new (httpServer: unknown, opts: unknown): SocketIOServer } | null = null;
try {
  // eslint-disable-next-line no-eval
  const socketio = eval('require')('socket.io');
  SocketIOServerClass = socketio.Server;
} catch {
  // socket.io not installed — all functions will no-op
}

/**
 * Initialize the Socket.io server. Idempotent — returns existing instance
 * if already initialized. No-op if socket.io is not installed.
 */
export function initSocketServer(httpServer: HTTPServer): SocketIOServer | null {
  if (io) return io;
  if (!SocketIOServerClass) return null;

  io = new SocketIOServerClass(httpServer, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.on('connection', (socket: { id: string; handshake: { auth: { token?: string } }; disconnect: (v: boolean) => void; join: (r: string) => void; leave: (r: string) => void; on: (e: string, h: (...args: unknown[]) => void) => void }) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      socket.disconnect(true);
      return;
    }

    socket.on('join', (...args: unknown[]) => {
      const room = String(args[0]);
      if (/^(business|user):[a-zA-Z0-9-]+$/.test(room)) {
        socket.join(room);
      }
    });

    socket.on('leave', (...args: unknown[]) => {
      socket.leave(String(args[0]));
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

/**
 * Get the current Socket.io server instance (or null if not yet initialized).
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Broadcast an event to a specific room (e.g. `business:abc-123`).
 * No-op if Socket.io is not initialized.
 */
export function broadcastEvent(room: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(room).emit(event, data);
}

/**
 * Broadcast an event to all connected clients.
 * No-op if Socket.io is not initialized.
 */
export function broadcastToAll(event: string, data: unknown): void {
  if (!io) return;
  io.emit(event, data);
}

/**
 * Get the count of currently connected clients.
 */
export async function getConnectionCount(): Promise<number> {
  if (!io) return 0;
  const sockets = await io.fetchSockets();
  return sockets.length;
}

/**
 * Disconnect all clients and close the server.
 * Useful for graceful shutdown.
 */
export function shutdownSocketServer(): void {
  if (!io) return;
  io.disconnectSockets(true);
  io.close();
  io = null;
  console.info('[Socket.io] Server shut down');
}
