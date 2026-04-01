// ═══════════════════════════════════════════════════════════════
// Realtime Gateway - WebSocket Gateway with JWT Authentication
// ═══════════════════════════════════════════════════════════════

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Logger, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import {
  WebSocketAuthPayload,
  SocketClientInfo,
  JoinRoomDto,
  LeaveRoomDto,
  RoomInfo,
  WebSocketEventName,
  EventMap,
} from './dto/realtime.dto';

/**
 * Authenticated Socket Interface
 */
interface AuthenticatedSocket extends Socket {
  data: {
    user: SocketClientInfo;
  };
}

/**
 * JWT Payload for WebSocket Authentication
 */
interface WsJwtPayload {
  sub: string;
  email: string;
  role: string;
  branchId?: string;
  permissions: string[];
  iat: number;
  exp: number;
}

/**
 * Room Types for Organization Isolation
 */
enum RoomType {
  ORGANIZATION = 'organization',
  BRANCH = 'branch',
  USER = 'user',
  ENTITY = 'entity', // For specific entities like property, lead, etc.
}

/**
 * Realtime Gateway
 * Handles WebSocket connections with JWT authentication and room management
 */
@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow all origins in development, configure properly for production
      callback(null, true);
    },
    credentials: true,
  },
  namespace: '/realtime',
  transports: ['websocket', 'polling'],
})
@Injectable()
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly connectedClients: Map<string, AuthenticatedSocket> = new Map();
  private readonly userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Gateway initialization
   */
  afterInit(server: Server) {
    this.logger.log('🚀 Realtime Gateway initialized');
    this.logger.log(`   Namespace: /realtime`);
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      this.logger.debug(`New connection attempt: ${client.id}`);

      // Extract token from handshake
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`No token provided for connection: ${client.id}`);
        client.emit('error', {
          code: 'AUTH_REQUIRED',
          message: 'Authentication token is required',
          messageAr: 'مطلوب رمز المصادقة',
        });
        client.disconnect(true);
        return;
      }

      // Verify and decode JWT
      const payload = await this.verifyToken(token);
      if (!payload) {
        this.logger.warn(`Invalid token for connection: ${client.id}`);
        client.emit('error', {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token',
          messageAr: 'رمز المصادقة غير صالح أو منتهي الصلاحية',
        });
        client.disconnect(true);
        return;
      }

      // Validate user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { organization: true },
      });

      if (!user || !user.isActive) {
        this.logger.warn(`User not found or inactive: ${payload.sub}`);
        client.emit('error', {
          code: 'USER_INACTIVE',
          message: 'User account is not active',
          messageAr: 'حساب المستخدم غير نشط',
        });
        client.disconnect(true);
        return;
      }

      // Set client authentication data
      client.data = {
        user: {
          id: client.id, // Socket ID
          userId: user.id, // User ID
          email: user.email,
          role: user.role,
          branchId: user.branchId,
          organizationId: user.organizationId,
          rooms: [],
          connectedAt: Date.now(),
        },
      };

      // Store client reference
      this.connectedClients.set(client.id, client);

      // Track user sockets
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      // Auto-join organization room
      const orgRoom = this.getRoomName(RoomType.ORGANIZATION, user.organizationId);
      await client.join(orgRoom);
      client.data.user.rooms?.push(orgRoom);

      // Auto-join branch room if user has branch
      if (user.branchId) {
        const branchRoom = this.getRoomName(RoomType.BRANCH, user.branchId);
        await client.join(branchRoom);
        client.data.user.rooms?.push(branchRoom);
      }

      // Auto-join user's personal room for direct messages
      const userRoom = this.getRoomName(RoomType.USER, user.id);
      await client.join(userRoom);
      client.data.user.rooms?.push(userRoom);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Successfully connected to realtime server',
        messageAr: 'تم الاتصال بنجاح بخادم الوقت الحقيقي',
        socketId: client.id,
        rooms: client.data.user.rooms,
        timestamp: Date.now(),
      });

      this.logger.log(
        `✅ Client connected: ${client.id} (User: ${user.email}, Org: ${user.organizationId})`,
      );

      // Broadcast user online status to organization
      this.server.to(orgRoom).emit('user.online', {
        userId: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(`Connection error for ${client.id}:`, error);
      client.emit('error', {
        code: 'CONNECTION_ERROR',
        message: 'An error occurred during connection',
        messageAr: 'حدث خطأ أثناء الاتصال',
      });
      client.disconnect(true);
    }
  }

  /**
   * Handle client disconnection
   */
  async handleDisconnect(client: AuthenticatedSocket) {
    try {
      const user = client.data?.user;
      if (!user) {
        this.logger.debug(`Unauthenticated client disconnected: ${client.id}`);
        return;
      }

      // Remove from connected clients
      this.connectedClients.delete(client.id);

      // Remove from user sockets tracking
      const userSocketSet = this.userSockets.get(user.id);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(user.id);
        }
      }

      this.logger.log(`❌ Client disconnected: ${client.id} (User: ${user.email})`);

      // Broadcast user offline status if no more connections
      const remainingSockets = this.userSockets.get(user.id);
      if (!remainingSockets || remainingSockets.size === 0) {
        const orgRoom = this.getRoomName(RoomType.ORGANIZATION, user.organizationId);
        this.server.to(orgRoom).emit('user.offline', {
          userId: user.id,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.logger.error(`Disconnect error for ${client.id}:`, error);
    }
  }

  /**
   * Extract JWT token from handshake
   */
  private extractToken(client: Socket): string | null {
    // Try auth object first
    const auth = client.handshake.auth as WebSocketAuthPayload | undefined;
    if (auth?.token) {
      return auth.token;
    }

    // Try query parameters
    const query = client.handshake.query;
    if (query.token && typeof query.token === 'string') {
      return query.token;
    }

    // Try authorization header
    const headers = client.handshake.headers;
    if (headers.authorization) {
      const [type, token] = headers.authorization.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    return null;
  }

  /**
   * Verify JWT token
   */
  private async verifyToken(token: string): Promise<WsJwtPayload | null> {
    try {
      const isDevelopment = this.configService.get('NODE_ENV') !== 'production';
      const secret = this.configService.get<string>('jwt.secret');
      const publicKey = this.configService.get<string>('jwt.publicKey');

      let secretOrKey: string;
      if (isDevelopment && secret) {
        secretOrKey = secret;
      } else if (publicKey) {
        secretOrKey = publicKey;
      } else if (secret) {
        secretOrKey = secret;
      } else {
        throw new Error('JWT secret not configured');
      }

      const payload = this.jwtService.verify<WsJwtPayload>(token, {
        secret: secretOrKey,
      });

      return payload;
    } catch (error) {
      this.logger.debug(`Token verification failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate room name based on type and ID
   */
  private getRoomName(type: RoomType, id: string): string {
    return `${type}:${id}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // Room Management Message Handlers
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle join room request
   */
  @SubscribeMessage('room.join')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinRoomDto,
  ) {
    try {
      const user = client.data.user;
      const room = data.room;

      // Validate room access based on naming convention
      const roomParts = room.split(':');
      const roomType = roomParts[0] as RoomType;
      const roomId = roomParts[1];

      // Organization isolation check
      if (roomType === RoomType.ORGANIZATION && roomId !== user.organizationId) {
        throw new WsException({
          code: 'FORBIDDEN',
          message: 'Cannot join organization room you do not belong to',
          messageAr: 'لا يمكنك الانضمام لغرفة منظمة لا تنتمي إليها',
        });
      }

      // Branch isolation check
      if (roomType === RoomType.BRANCH && roomId !== user.branchId) {
        // Allow if user doesn't have branch restriction
        if (user.branchId) {
          throw new WsException({
            code: 'FORBIDDEN',
            message: 'Cannot join branch room you do not belong to',
            messageAr: 'لا يمكنك الانضمام لغرفة فرع لا تنتمي إليه',
          });
        }
      }

      // Join the room
      await client.join(room);
      
      if (!client.data.user.rooms?.includes(room)) {
        client.data.user.rooms?.push(room);
      }

      client.emit('room.joined', {
        room,
        timestamp: Date.now(),
      });

      this.logger.debug(`Client ${client.id} joined room: ${room}`);

      return { success: true, room };
    } catch (error) {
      this.logger.error(`Join room error: ${error.message}`);
      throw new WsException({
        code: 'JOIN_ERROR',
        message: error.message || 'Failed to join room',
        messageAr: 'فشل في الانضمام للغرفة',
      });
    }
  }

  /**
   * Handle leave room request
   */
  @SubscribeMessage('room.leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: LeaveRoomDto,
  ) {
    try {
      const room = data.room;

      // Cannot leave mandatory rooms
      const user = client.data.user;
      const orgRoom = this.getRoomName(RoomType.ORGANIZATION, user.organizationId);
      const userRoom = this.getRoomName(RoomType.USER, user.id);

      if (room === orgRoom || room === userRoom) {
        throw new WsException({
          code: 'CANNOT_LEAVE',
          message: 'Cannot leave mandatory rooms',
          messageAr: 'لا يمكن مغادرة الغرف الإلزامية',
        });
      }

      await client.leave(room);
      
      const roomIndex = client.data.user.rooms?.indexOf(room);
      if (roomIndex !== undefined && roomIndex > -1) {
        client.data.user.rooms?.splice(roomIndex, 1);
      }

      client.emit('room.left', {
        room,
        timestamp: Date.now(),
      });

      this.logger.debug(`Client ${client.id} left room: ${room}`);

      return { success: true, room };
    } catch (error) {
      this.logger.error(`Leave room error: ${error.message}`);
      throw new WsException({
        code: 'LEAVE_ERROR',
        message: error.message || 'Failed to leave room',
        messageAr: 'فشل في مغادرة الغرفة',
      });
    }
  }

  /**
   * Get rooms info
   */
  @SubscribeMessage('rooms.list')
  handleRoomsList(@ConnectedSocket() client: AuthenticatedSocket) {
    const user = client.data.user;
    const rooms: RoomInfo[] = [];

    for (const room of user.rooms || []) {
      const roomInfo: RoomInfo = {
        name: room,
        clientCount: this.server.sockets.adapter.rooms.get(room)?.size || 0,
      };

      const roomParts = room.split(':');
      roomInfo.type = roomParts[0] as any;

      rooms.push(roomInfo);
    }

    return { rooms };
  }

  // ═══════════════════════════════════════════════════════════════
  // Heartbeat / Ping-Pong
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle ping for connection keep-alive
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    return {
      event: 'pong',
      timestamp: Date.now(),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Public Methods for Emitting Events
  // ═══════════════════════════════════════════════════════════════

  /**
   * Emit event to organization room
   */
  emitToOrganization<T extends WebSocketEventName>(
    organizationId: string,
    event: T,
    data: EventMap[T],
  ): void {
    const room = this.getRoomName(RoomType.ORGANIZATION, organizationId);
    this.server.to(room).emit(event, {
      event,
      timestamp: Date.now(),
      organizationId,
      data,
    });
    this.logger.debug(`Emitted ${event} to organization ${organizationId}`);
  }

  /**
   * Emit event to branch room
   */
  emitToBranch<T extends WebSocketEventName>(
    branchId: string,
    event: T,
    data: EventMap[T],
  ): void {
    const room = this.getRoomName(RoomType.BRANCH, branchId);
    this.server.to(room).emit(event, {
      event,
      timestamp: Date.now(),
      branchId,
      data,
    });
    this.logger.debug(`Emitted ${event} to branch ${branchId}`);
  }

  /**
   * Emit event to specific user
   */
  emitToUser<T extends WebSocketEventName>(
    userId: string,
    event: T,
    data: EventMap[T],
  ): void {
    const room = this.getRoomName(RoomType.USER, userId);
    this.server.to(room).emit(event, {
      event,
      timestamp: Date.now(),
      data,
    });
    this.logger.debug(`Emitted ${event} to user ${userId}`);
  }

  /**
   * Emit event to specific entity room
   */
  emitToEntity<T extends WebSocketEventName>(
    entityType: string,
    entityId: string,
    event: T,
    data: EventMap[T],
  ): void {
    const room = `${entityType}:${entityId}`;
    this.server.to(room).emit(event, {
      event,
      timestamp: Date.now(),
      data,
    });
    this.logger.debug(`Emitted ${event} to ${entityType}:${entityId}`);
  }

  /**
   * Emit event to all connected clients (broadcast)
   * Use sparingly - prefer targeted emissions
   */
  broadcast<T extends WebSocketEventName>(event: T, data: EventMap[T]): void {
    this.server.emit(event, {
      event,
      timestamp: Date.now(),
      data,
    });
    this.logger.debug(`Broadcast ${event} to all clients`);
  }

  /**
   * Emit event to specific socket
   */
  emitToSocket<T extends WebSocketEventName>(
    socketId: string,
    event: T,
    data: EventMap[T],
  ): boolean {
    const client = this.connectedClients.get(socketId);
    if (client) {
      client.emit(event, {
        event,
        timestamp: Date.now(),
        data,
      });
      return true;
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════
  // Utility Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get online users in organization
   */
  getOnlineUsersInOrganization(organizationId: string): SocketClientInfo[] {
    const users: SocketClientInfo[] = [];
    const seenUsers = new Set<string>();

    for (const [, client] of this.connectedClients) {
      if (client.data.user.organizationId === organizationId) {
        const userId = client.data.user.id;
        if (!seenUsers.has(userId)) {
          seenUsers.add(userId);
          users.push(client.data.user);
        }
      }
    }

    return users;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  /**
   * Get user's socket connections
   */
  getUserSockets(userId: string): string[] {
    return Array.from(this.userSockets.get(userId) || []);
  }

  /**
   * Disconnect all sockets for a user
   */
  async disconnectUser(userId: string, reason?: string): Promise<number> {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds) return 0;

    let count = 0;
    for (const socketId of socketIds) {
      const client = this.connectedClients.get(socketId);
      if (client) {
        client.emit('disconnect.reason', {
          reason: reason || 'Session terminated',
          messageAr: reason || 'تم إنهاء الجلسة',
        });
        client.disconnect(true);
        count++;
      }
    }

    this.logger.log(`Disconnected ${count} sockets for user ${userId}`);
    return count;
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy() {
    this.logger.log('Shutting down Realtime Gateway...');
    
    // Disconnect all clients gracefully
    for (const [socketId, client] of this.connectedClients) {
      client.emit('server.shutdown', {
        message: 'Server is shutting down',
        messageAr: 'الخادم قيد الإغلاق',
      });
      client.disconnect(true);
    }

    this.connectedClients.clear();
    this.userSockets.clear();
    this.logger.log('Realtime Gateway shutdown complete');
  }
}
