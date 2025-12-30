import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt';
import User from '../models/User';
import Friend from '../models/Friend';
import { sendPushNotificationToUser } from '../services/notificationService';
import * as activityService from '../services/activityService';

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
        
        // Ensure sender name is available
        if (!sender.name) {
          console.warn('[WebSocket] Sender name is missing, using default:', userId);
          sender.name = 'A friend'; // Default fallback name
        }

        // Send push notification for friend request - reliable delivery
        console.log(`[WebSocket] Sending friend request push notification to ${data.recipientId}`);
        await sendPushNotificationToUser(
          data.recipientId,
          'New Friend Request',
          `${sender.name} wants to be your friend`,
          {
            eventType: 'friend_request_received',
            senderId: userId,
            requestId: '', // Will be set by the friend service
          }
        );

        // Send WebSocket message for real-time feel (no connectivity check needed)
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

        // Get the original requester ID from the friend request
        const friendRequest = await Friend.findById(data.requestId);
        if (!friendRequest) {
          console.error('[WebSocket] Friend request not found:', data.requestId);
          return;
        }

        const requesterId = friendRequest.requesterId.toString();
        const recipientId = friendRequest.recipientId.toString();

        // Determine who to notify (the other person in the friend request)
        const targetUserId = requesterId === userId ? recipientId : requesterId;

        console.log(`[WebSocket] Notifying ${targetUserId} about friend request ${data.action}`);

        // Send push notification for friend request response - reliable delivery
        const actionText = data.action === 'accept' ? 'accepted' : 'declined';
        console.log(`[WebSocket] Sending friend request response push notification to ${targetUserId}`);
        await sendPushNotificationToUser(
          targetUserId,
          'Friend Request ' + (data.action === 'accept' ? 'Accepted' : 'Declined'),
          `${responder.name} ${actionText} your friend request`,
          {
            eventType: `friend_request_${data.action}`,
            responderId: userId,
            requestId: data.requestId,
          }
        );

        // Send WebSocket message for real-time feel (no connectivity check needed)
        const targetSocket = findSocketByUserId(targetUserId);
        if (targetSocket) {
          targetSocket.emit(`friend_request_${data.action}`, {
            requestId: data.requestId,
            responderId: userId,
            responderName: responder.name,
            action: data.action,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('[WebSocket] Error handling friend request response:', error);
      }
    });

    // Handle safe home event
    socket.on('safe_home', async (data: { message: string }) => {
      try {
        console.log(`[WebSocket] Safe home event from ${userId} with message: ${data.message}`);
        
        // Get sender info
        const sender = await User.findById(userId).select('name email profilePicture');
        if (!sender) {
          console.error('[WebSocket] Sender not found:', userId);
          return;
        }
        
        // Ensure sender name is available
        if (!sender.name) {
          console.warn('[WebSocket] Sender name is missing, using default:', userId);
          sender.name = 'A friend'; // Default fallback name
        }

        // Get user's friends to broadcast to
        
        // Find all friends of this user (where userId is either requesterId or recipientId)
        const friendRecords = await Friend.find({
          $or: [
            { requesterId: userId, status: 'accepted' },
            { recipientId: userId, status: 'accepted' }
          ]
        });
        
        // Get friend user IDs - convert ObjectIds to strings for proper comparison
        const friendIds = friendRecords.map((friend: any) => {
          const requesterId = friend.requesterId.toString();
          const recipientId = friend.recipientId.toString();
          return requesterId === userId.toString() ? recipientId : requesterId;
        });
        
        console.log(`[WebSocket] Broadcasting safe home to ${friendIds.length} friends:`, friendIds);

        // Create activity for safe home arrival
        try {
          // Get user's home address
          const userWithAddress = await User.findById(userId).select('name homeAddress');
          const homeAddress = userWithAddress?.homeAddress;
          
          // Extract city from home address details or parse from full address
          let cityName = 'home';
          if (homeAddress?.details?.city) {
            cityName = homeAddress.details.city;
          } else if (homeAddress?.address) {
            // Try to extract city from full address (format: "Street, City, State, Postal, Country")
            const parts = homeAddress.address.split(',').map(p => p.trim());
            if (parts.length >= 2) {
              cityName = parts[1]; // Second part is usually the city
            }
          }
          
          // Include sender in visibleTo so they can see their own activity
          await activityService.createActivity({
            userId: userId.toString(),
            type: 'home_arrival',
            message: `${sender.name} sent safe home`,
            location: homeAddress ? {
              name: cityName,
              coordinates: {
                lat: homeAddress.coordinates.lat,
                lng: homeAddress.coordinates.lng,
              },
            } : undefined,
            visibleTo: [userId.toString(), ...friendIds],
          });
          console.log('[WebSocket] Activity created for safe home arrival');
        } catch (activityError) {
          console.error('[WebSocket] Error creating activity for safe home:', activityError);
          // Don't fail the operation if activity creation fails
        }

        // Send push notifications for safety messages - reliable delivery
        for (const friendId of friendIds) {
          console.log(`[WebSocket] Sending safe home push notification to friend: ${friendId}`);
          await sendPushNotificationToUser(
            friendId,
            'Safe Home',
            `${sender.name} ${data.message}`,
            { eventType: 'friend_safe_home', userId: userId, userName: sender.name }
          );

          // Send WebSocket message for real-time feel (no connectivity check needed)
          const friendSocket = findSocketByUserId(friendId);
          if (friendSocket) {
            friendSocket.emit('friend_safe_home', {
              userId: userId,
              userName: sender.name,
              message: data.message,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('[WebSocket] Error handling safe home event:', error);
      }
    });

    // Handle quick action message event
    socket.on('quick_action_message', async (data: { message: string, type: string }) => {
      try {
        console.log(`[WebSocket] Quick action message from ${userId} with type: ${data.type} and message: ${data.message}`);

        // Get sender info with location
        const sender = await User.findById(userId).select('name email profilePicture lastKnownLocation');
        if (!sender) {
          console.error('[WebSocket] Sender not found:', userId);
          return;
        }

        // Ensure sender name is available
        if (!sender.name) {
          console.warn('[WebSocket] Sender name is missing, using default:', userId);
          sender.name = 'A friend'; // Default fallback name
        }

        // Find all friends of this user (where userId is either requesterId or recipientId)
        const friendRecords = await Friend.find({
          $or: [
            { requesterId: userId, status: 'accepted' },
            { recipientId: userId, status: 'accepted' }
          ]
        });

        // Get friend user IDs - convert ObjectIds to strings for proper comparison
        const friendIds = friendRecords.map((friend: any) => {
          const requesterId = friend.requesterId.toString();
          const recipientId = friend.recipientId.toString();
          return requesterId === userId.toString() ? recipientId : requesterId;
        });

        console.log(`[WebSocket] Broadcasting quick action message to ${friendIds.length} friends:`, friendIds);

        // Create activity for quick action message
        try {
          // Get location from user's last known location
          let location = undefined;
          if (sender.lastKnownLocation?.coordinates) {
            const lat = sender.lastKnownLocation.coordinates.lat;
            const lng = sender.lastKnownLocation.coordinates.lng;
            
            // Reverse geocode to get city name
            let locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`; // Fallback to coordinates
            
            try {
              const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`;
              const geocodeResponse = await fetch(geocodeUrl, {
                headers: {
                  'User-Agent': 'EVA-Alert-App/1.0'
                }
              });
              
              if (geocodeResponse.ok) {
                const geocodeData: any = await geocodeResponse.json();
                const address = geocodeData.address || {};
                
                // Build location string: City, State/Region (if available)
                const city = address.city || address.town || address.village || address.municipality;
                const state = address.state || address.province || address.region;
                
                if (city && state) {
                  locationName = `${city}, ${state}`;
                } else if (city) {
                  locationName = city;
                } else if (state) {
                  locationName = state;
                }
                
                console.log('[WebSocket] Reverse geocoded location:', locationName);
              }
            } catch (geocodeError) {
              console.error('[WebSocket] Reverse geocoding error:', geocodeError);
              // Continue with coordinate fallback
            }
            
            location = {
              name: locationName,
              coordinates: { lat, lng },
            };
          }

          // Include sender in visibleTo so they can see their own activity
          await activityService.createActivity({
            userId: userId.toString(),
            type: 'message',
            message: `${sender.name} ${data.message}`,
            location,
            metadata: { quickActionType: data.type },
            visibleTo: [userId.toString(), ...friendIds],
          });
          console.log('[WebSocket] Activity created for quick action message with location:', location ? 'yes' : 'no');
        } catch (activityError) {
          console.error('[WebSocket] Error creating activity for quick action:', activityError);
          // Don't fail the operation if activity creation fails
        }

        // Send push notifications for safety messages - reliable delivery
        for (const friendId of friendIds) {
          console.log(`[WebSocket] Sending push notification to friend: ${friendId}`);
          await sendPushNotificationToUser(
            friendId,
            'Message',
            `${sender.name} ${data.message}`,
            {
              eventType: 'friend_quick_action_message',
              userId: userId,
              userName: sender.name,
              type: data.type
            }
          );

          // Send WebSocket message for real-time feel (no connectivity check needed)
          const friendSocket = findSocketByUserId(friendId);
          if (friendSocket) {
            friendSocket.emit('friend_quick_action_message', {
              userId: userId,
              userName: sender.name,
              message: data.message,
              type: data.type,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('[WebSocket] Error handling quick action message event:', error);
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
