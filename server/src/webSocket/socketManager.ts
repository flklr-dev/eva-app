import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt';
import User from '../models/User';

// Store connected users with socket instances
interface ConnectedUser {
  userId: string;
  socket: Socket;
  lastSeen: Date;
}

const connectedUsers: Map<string, ConnectedUser> = new Map();

// Initialize WebSocket server
export const initializeWebSocket = (io: Server): void => {
  console.log('✓ WebSocket server initialized');

  // Middleware to authenticate users
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      console.log('[WebSocket] Received token (first 20 chars):', token.substring(0, 20) + '...');
      console.log('[WebSocket] Using secret length:', JWT_SECRET.length);
      
      // Verify JWT token using jsonwebtoken library
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      console.log('[WebSocket] Token verified successfully for userId:', decoded.userId);
      
      // Attach user to socket
      (socket as any).userId = decoded.userId;
      next();
    } catch (error) {
      console.error('[WebSocket] Authentication error:', error);
      if (error instanceof Error) {
        console.error('[WebSocket] Error name:', error.name);
        console.error('[WebSocket] Error message:', error.message);
      }
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Handle socket connections
  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`[WebSocket] User ${userId} connected with socket ID ${socket.id}`);

    // Add user to connected users map with socket instance
    connectedUsers.set(userId, {
      userId,
      socket,
      lastSeen: new Date()
    });

    // Handle friend request sent event
    socket.on('friend_request_sent', async (data: { recipientId: string }) => {
      try {
        console.log(`[WebSocket] Friend request sent from ${userId} to ${data.recipientId}`);
        
        // Get sender info
        const sender = await User.findById(userId).select('name email profilePicture');
        if (!sender) {
          console.error('[WebSocket] Sender not found:', userId);
          return;
        }

        // Emit event to recipient if they're online
        const recipientSocket = findSocketByUserId(data.recipientId);
        if (recipientSocket) {
          recipientSocket.emit('friend_request_received', {
            requestId: '', // Will be set by the friend service
            senderId: userId,
            senderName: sender.name,
            senderEmail: sender.email,
            senderProfilePicture: sender.profilePicture,
            timestamp: new Date().toISOString()
          });
          console.log(`[WebSocket] Friend request notification sent to ${data.recipientId}`);
        } else {
          console.log(`[WebSocket] Recipient ${data.recipientId} is not online`);
        }
      } catch (error) {
        console.error('[WebSocket] Error handling friend request sent:', error);
      }
    });

    // Handle friend request response event
    socket.on('friend_request_responded', async (data: { requestId: string, action: 'accept' | 'reject' }) => {
      try {
        console.log(`[WebSocket] Friend request ${data.action} by ${userId} for request ${data.requestId}`);
        
        // Get responder info
        const responder = await User.findById(userId).select('name email');
        if (!responder) {
          console.error('[WebSocket] Responder not found:', userId);
          return;
        }

        // TODO: Get the original requester ID from the friend request
        // This would require querying the Friend model to find the requester
        
        // For now, we'll emit to all connected users (this should be improved)
        socket.broadcast.emit(`friend_request_${data.action}`, {
          requestId: data.requestId,
          responderId: userId,
          responderName: responder.name,
          action: data.action,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[WebSocket] Error handling friend request response:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[WebSocket] User disconnected: ${socket.id}`);
      connectedUsers.delete(userId);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`[WebSocket] Socket error for ${socket.id}:`, error);
    });
  });
};

// Helper function to find socket by user ID
const findSocketByUserId = (userId: string): Socket | null => {
  const connectedUser = connectedUsers.get(userId);
  return connectedUser ? connectedUser.socket : null;
};

// Emit events to specific users
export const emitFriendRequestToUser = (userId: string, data: any): void => {
  console.log('[WebSocket] ========== EMIT FRIEND REQUEST ==========');
  console.log('[WebSocket] Target userId:', userId);
  console.log('[WebSocket] Data to emit:', JSON.stringify(data));
  
  const socket = findSocketByUserId(userId);
  if (socket) {
    console.log('[WebSocket] ✓ User is online, emitting event');
    socket.emit('friend_request_received', data);
    console.log('[WebSocket] Friend request emitted to user', userId);
  } else {
    console.log('[WebSocket] ✗ User', userId, 'is not online, cannot emit friend request');
  }
  console.log('[WebSocket] =============================================');
};

export const emitFriendRequestResponseToUser = (userId: string, data: any): void => {
  const socket = findSocketByUserId(userId);
  if (socket) {
    socket.emit(`friend_request_${data.action}`, data);
    console.log(`[WebSocket] Friend request response emitted to user ${userId}`);
  } else {
    console.log(`[WebSocket] User ${userId} is not online, cannot emit friend request response`);
  }
};

// Get connected users count
export const getConnectedUsersCount = (): number => {
  return connectedUsers.size;
};
