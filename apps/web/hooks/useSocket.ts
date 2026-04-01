// ═══════════════════════════════════════════════════════════════
// useSocket Hook - خطاف الاتصال بالوقت الحقيقي
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type SocketConnectionState = 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error';

interface ServerToClientEvents {
  'lead.updated': (data: any) => void;
  'lead.stage_changed': (data: any) => void;
  'lead.assigned': (data: any) => void;
  'notification.new': (data: any) => void;
  'property.locked': (data: any) => void;
  'property.unlocked': (data: any) => void;
  'inbox.message': (data: any) => void;
  'connection:established': (data: { socketId: string; userId?: string }) => void;
  'connection:error': (data: { error: string; message?: string; code?: string }) => void;
}

interface ClientToServerEvents {
  'subscribe:lead': (leadId: string) => void;
  'subscribe:property': (propertyId: string) => void;
  'subscribe:entity': (entityType: string, entityId: string) => void;
  'unsubscribe:entity': (entityType: string, entityId: string) => void;
  'mark:read': (notificationId: string) => void;
  'notification:mark-read': (notificationId: string) => void;
  'notifications:mark-all-read': () => void;
  'typing:start': (data: { conversationId: string } | string) => void;
  'typing:stop': (data: { conversationId: string } | string) => void;
  'lead:updated': (data: any) => void;
}

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseSocketOptions {
  url?: string;
  authToken: string | null;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
  autoConnect?: boolean;
  onConnectionError?: (error: { message: string; code: string }) => void;
  onConnectionEstablished?: (data: { socketId: string; userId: string }) => void;
}

interface UseSocketReturn {
  socket: TypedSocket | null;
  connectionState: SocketConnectionState;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  subscribe: (entityType: string, entityId: string) => void;
  unsubscribe: (entityType: string, entityId: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  on: <T extends keyof ServerToClientEvents>(
    event: T,
    callback: (data: Parameters<ServerToClientEvents[T]>[0]) => void,
  ) => () => void;
  off: <T extends keyof ServerToClientEvents>(
    event: T,
    callback?: (data: Parameters<ServerToClientEvents[T]>[0]) => void,
  ) => void;
}

// ─────────────────────────────────────────────────────────────────
// Socket Context for Global Instance
// ─────────────────────────────────────────────────────────────────

let globalSocket: TypedSocket | null = null;
let connectionCount = 0;

// ─────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────

export function useSocket(options: UseSocketOptions): UseSocketReturn {
  const {
    url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    authToken,
    reconnection = true,
    reconnectionAttempts = 10,
    reconnectionDelay = 1000,
    reconnectionDelayMax = 5000,
    timeout = 20000,
    autoConnect = true,
    onConnectionError,
    onConnectionEstablished,
  } = options;

  const socketRef = useRef<TypedSocket | null>(null);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>('disconnected');
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const isConnectingRef = useRef(false);

  // ─────────────────────────────────────────────────────────────────
  // Connection Management
  // ─────────────────────────────────────────────────────────────────

  const createSocket = useCallback(() => {
    if (!authToken) return null;

    const socket = io(url, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      reconnectionDelayMax,
      timeout,
    }) as TypedSocket;

    return socket;
  }, [url, authToken, reconnection, reconnectionAttempts, reconnectionDelay, reconnectionDelayMax, timeout]);

  const connect = useCallback(() => {
    if (!authToken || isConnectingRef.current) return;

    // Use existing socket if available
    if (globalSocket && globalSocket.connected) {
      socketRef.current = globalSocket;
      setConnectionState('connected');
      return;
    }

    isConnectingRef.current = true;
    setConnectionState('connecting');

    // Create new socket
    const socket = createSocket();
    if (!socket) {
      setConnectionState('error');
      isConnectingRef.current = false;
      return;
    }

    socketRef.current = socket;
    globalSocket = socket;
    connectionCount++;

    // Connection established
    socket.on('connection:established', (data: { socketId: string; userId?: string }) => {
      setConnectionState('connected');
      isConnectingRef.current = false;
      if (data.userId) {
        onConnectionEstablished?.({ socketId: data.socketId, userId: data.userId });
      }

      // Re-subscribe to previous subscriptions
      subscriptionsRef.current.forEach((sub) => {
        const [entityType, entityId] = sub.split(':');
        socket.emit('subscribe:entity', entityType, entityId);
      });
    });

    // Connection error
    socket.on('connection:error', (error: { error: string; message?: string; code?: string }) => {
      setConnectionState('error');
      isConnectingRef.current = false;
      onConnectionError?.({ message: error.message || error.error, code: error.code || 'CONNECTION_ERROR' });
    });

    // Reconnecting
    socket.io.on('reconnect_attempt', () => {
      setConnectionState('reconnecting');
    });

    socket.io.on('reconnect_failed', () => {
      setConnectionState('error');
      isConnectingRef.current = false;
    });

    // Connect
    socket.connect();
  }, [authToken, createSocket, onConnectionEstablished, onConnectionError]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      connectionCount--;
      
      // Only disconnect if no other components are using it
      if (connectionCount <= 0) {
        socketRef.current.disconnect();
        globalSocket = null;
        connectionCount = 0;
      }
      
      socketRef.current = null;
      setConnectionState('disconnected');
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // Auto-connect on mount
  // ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (autoConnect && authToken) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, authToken, connect, disconnect]);

  // ─────────────────────────────────────────────────────────────────
  // Subscription Methods
  // ─────────────────────────────────────────────────────────────────

  const subscribe = useCallback((entityType: string, entityId: string) => {
    const key = `${entityType}:${entityId}`;
    subscriptionsRef.current.add(key);

    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:entity', entityType, entityId);
    }
  }, []);

  const unsubscribe = useCallback((entityType: string, entityId: string) => {
    const key = `${entityType}:${entityId}`;
    subscriptionsRef.current.delete(key);

    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe:entity', entityType, entityId);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // Typing Indicators
  // ─────────────────────────────────────────────────────────────────

  const startTyping = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing:start', { conversationId });
    }
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing:stop', { conversationId });
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // Notification Methods
  // ─────────────────────────────────────────────────────────────────

  const markNotificationRead = useCallback((notificationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('notification:mark-read', notificationId);
    }
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('notifications:mark-all-read');
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // Event Handling
  // ─────────────────────────────────────────────────────────────────

  const on = useCallback(<T extends keyof ServerToClientEvents>(
    event: T,
    callback: (data: Parameters<ServerToClientEvents[T]>[0]) => void,
  ) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback as never);
    }

    // Return cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, callback as never);
      }
    };
  }, []);

  const off = useCallback(<T extends keyof ServerToClientEvents>(
    event: T,
    callback?: (data: Parameters<ServerToClientEvents[T]>[0]) => void,
  ) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback as never);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────

  return {
    socket: socketRef.current,
    connectionState,
    isConnected: connectionState === 'connected',
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    startTyping,
    stopTyping,
    markNotificationRead,
    markAllNotificationsRead,
    on,
    off,
  };
}

// ═══════════════════════════════════════════════════════════════
// Specialized Hooks
// ═══════════════════════════════════════════════════════════════

/**
 * Hook for subscribing to lead events
 */
export function useLeadEvents(
  socket: TypedSocket | null,
  leadId: string | null,
  callbacks: {
    onUpdated?: (data: any) => void;
    onStageChanged?: (data: any) => void;
    onAssigned?: (data: any) => void;
  },
) {
  useEffect(() => {
    if (!socket || !leadId) return;

    // Subscribe to lead
    socket.emit('subscribe:entity', 'lead', leadId);

    // Register listeners
    if (callbacks.onUpdated) {
      socket.on('lead.updated', callbacks.onUpdated);
    }

    return () => {
      socket.emit('unsubscribe:entity', 'lead', leadId);
      if (callbacks.onUpdated) socket.off('lead.updated', callbacks.onUpdated);
    };
  }, [socket, leadId, callbacks]);
}

/**
 * Hook for subscribing to property events
 */
export function usePropertyEvents(
  socket: TypedSocket | null,
  propertyId: string | null,
  callbacks: {
    onLocked?: (data: any) => void;
    onUnlocked?: (data: any) => void;
  },
) {
  useEffect(() => {
    if (!socket || !propertyId) return;

    socket.emit('subscribe:entity', 'property', propertyId);

    if (callbacks.onLocked) socket.on('property.locked', callbacks.onLocked);
    if (callbacks.onUnlocked) socket.on('property.unlocked', callbacks.onUnlocked);

    return () => {
      socket.emit('unsubscribe:entity', 'property', propertyId);
      if (callbacks.onLocked) socket.off('property.locked', callbacks.onLocked);
      if (callbacks.onUnlocked) socket.off('property.unlocked', callbacks.onUnlocked);
    };
  }, [socket, propertyId, callbacks]);
}

/**
 * Hook for subscribing to conversation events
 */
export function useConversationEvents(
  socket: TypedSocket | null,
  conversationId: string | null,
  callbacks: {
    onMessageReceived?: (data: any) => void;
    onTyping?: (data: any) => void;
  },
) {
  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('subscribe:entity', 'conversation', conversationId);

    return () => {
      socket.emit('unsubscribe:entity', 'conversation', conversationId);
    };
  }, [socket, conversationId, callbacks]);
}

/**
 * Hook for subscribing to notifications
 */
export function useNotificationEvents(
  socket: TypedSocket | null,
  callbacks: {
    onNew?: (data: any) => void;
  },
) {
  useEffect(() => {
    if (!socket) return;

    if (callbacks.onNew) socket.on('notification.new', callbacks.onNew);

    return () => {
      if (callbacks.onNew) socket.off('notification.new', callbacks.onNew);
    };
  }, [socket, callbacks]);
}

export default useSocket;
