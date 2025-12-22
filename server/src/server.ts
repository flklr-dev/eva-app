import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeWebSocket } from './webSocket/socketManager';
import authRoutes from './routes/authRoutes';
import adminAuthRoutes from './routes/adminAuthRoutes';
import notificationRoutes from './routes/notifications';
import friendRoutes from './routes/friendRoutes';
import profileRoutes from './routes/profileRoutes';

// Load environment variables
console.log('[Server] Loading environment variables...');
const dotenvResult = dotenv.config();
console.log('[Server] dotenv result:', dotenvResult);
console.log('[Server] CLOUDINARY_CLOUD_NAME after dotenv:', process.env.CLOUDINARY_CLOUD_NAME);

// Initialize Cloudinary after environment variables are loaded
console.log('[Server] Initializing Cloudinary configuration...');
try {
  const { validateConfig } = require('./config/cloudinary');
  validateConfig();
  console.log('✓ Cloudinary configuration validated');
} catch (error) {
  console.error('✗ Cloudinary configuration error:', error instanceof Error ? error.message : 'Unknown error');
  console.warn('⚠️ Profile picture upload will not work without proper Cloudinary configuration');
}

const app = express();

// Security middleware
app.use(helmet());
// Configure CORS with environment-based allowed origins
const getAllowedOrigins = (): string[] => {
  const origins = [];
  
  // Production origins from environment
  if (process.env.WEB_DASHBOARD_URL) {
    origins.push(process.env.WEB_DASHBOARD_URL);
  }
  if (process.env.ALB_URL) {
    origins.push(process.env.ALB_URL);
  }
  if (process.env.CLIENT_URL) {
    origins.push(process.env.CLIENT_URL);
  }
  
  // Development origins (only in dev mode)
  if (process.env.NODE_ENV !== 'production') {
    origins.push(
      'http://localhost:8081',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:8081'
    );
  }
  
  return origins;
};

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (mobile apps, Postman, same-origin)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Check exact match first
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    
    // In production, allow ELB health checks
    if (process.env.NODE_ENV === 'production' && origin.includes('.elb.amazonaws.com')) {
      callback(null, true);
      return;
    }
    
    // Allow local network IPs (for development and testing)
    if (origin.startsWith('http://192.168.') || origin.startsWith('http://127.') || origin.startsWith('http://10.')) {
      callback(null, true);
      return;
    }
    
    console.log('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✓ MongoDB Connected Successfully');
  } catch (error) {
    console.error('✗ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Invite route - serves HTML page for QR code scanning
// This allows iPhone Camera to recognize the QR code as a valid URL
app.get('/invite/:userId', async (req, res) => {
  console.log('✓ /invite/:userId route hit - userId:', req.params.userId);
  const { userId } = req.params;
  const inviteCode = `EVA-ALERT:${userId}`;
  
  // Validate userId format (MongoDB ObjectId)
  if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
    console.log('✗ Invalid userId format:', userId);
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Invite Link</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 40px; }
            h1 { color: #333; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <h1>Invalid Invite Link</h1>
          <p>This invite link is not valid.</p>
        </body>
      </html>
    `);
  }

  // Fetch user details to display in the invitation page
  let userName = 'Friend';
  let userEmail = '';
  try {
    const User = require('./models/User').default;
    const user = await User.findById(userId).select('name email');
    if (user) {
      userName = user.name || 'Friend';
      userEmail = user.email || '';
      console.log('✓ User details fetched for invite page:', userName);
    }
  } catch (error) {
    console.log('⚠ Could not fetch user details for invite page, using default');
  }

  // HTML page that attempts to open the app via deep link
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Add Friend - EVA Alert</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            color: #333;
          }
          h1 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 24px;
          }
          .user-info {
            background: #f3f4f6;
            border-radius: 12px;
            padding: 16px;
            margin: 15px 0;
            border-left: 4px solid #667eea;
          }
          .user-name {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin: 0;
          }
          .user-email {
            font-size: 13px;
            color: #6b7280;
            margin: 4px 0 0 0;
          }
          p {
            color: #666;
            margin: 10px 0;
            line-height: 1.6;
          }
          .button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
            width: 100%;
            transition: transform 0.2s;
          }
          .button:hover {
            transform: scale(1.05);
          }
          .button:active {
            transform: scale(0.98);
          }
          .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          .code {
            background: #f6f7fb;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 12px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 14px;
            word-break: break-all;
            margin-top: 16px;
          }
          .subtle {
            font-size: 13px;
            color: #6b7280;
            margin-top: 10px;
          }
          .status {
            margin-top: 14px;
            font-size: 13px;
            color: #6b7280;
          }
          .success {
            color: #059669;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Add Friend</h1>
          <div class="user-info">
            <p class="user-name">${userName}</p>
          </div>
          <p>Opening EVA Alert app...</p>
          <div class="spinner"></div>
          <p style="font-size: 14px; margin-top: 20px;">Tap below to copy the invitation code:</p>
          <button class="button" onclick="openApp()">Copy Invitation Code</button>
          <p class="subtle">Then open the EVA Alert app - the invitation will be processed automatically.</p>
          <div class="code" id="inviteCode">${inviteCode}</div>
          <div class="status" id="status"></div>
        </div>
        <script>
          // Copy invitation code to clipboard and provide instructions
          const inviteCode = '${inviteCode}';
          const statusEl = document.getElementById('status');
          
          function openApp() {
            copyCode();
            statusEl.textContent = '✅ Code copied! Now open the EVA Alert app - the invitation will be processed automatically.';
            statusEl.className = 'status success';
          }

          async function copyCode() {
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(inviteCode);
              } else {
                // Fallback for older browsers
                const ta = document.createElement('textarea');
                ta.value = inviteCode;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
              }
              statusEl.textContent = 'Copied! Open EVA Alert and it will detect the code.';
              statusEl.className = 'status success';
            } catch (e) {
              statusEl.textContent = 'Copy failed. Please manually select and copy the code.';
              statusEl.className = 'status';
            }
          }
          
          // Auto-open on page load
          window.onload = function() {
            openApp();
          };
          
          // Also try on visibility change (when user switches back)
          document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
              openApp();
            }
          });
        </script>
      </body>
    </html>
  `;

  console.log('✓ Sending invite HTML page for userId:', userId);
  res.send(html);
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Auth Routes
app.use('/api/auth', authRoutes);

// Friend Routes
app.use('/api/friends', friendRoutes);
console.log('✓ Friend routes registered at /api/friends');

// Profile Routes
app.use('/api/profile', profileRoutes);
console.log('✓ Profile routes registered at /api/profile');

// Notification Routes
app.use('/api/notifications', notificationRoutes);

// Admin Auth Routes
app.use('/api/admin/auth', adminAuthRoutes);

// Get network IP address
const getNetworkIP = (): string => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    const net = nets[name];
    if (net) {
      for (const netInfo of net) {
        // Skip internal and non-IPv4 addresses
        // Include common private IP ranges: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
        if (netInfo.family === 'IPv4' && !netInfo.internal &&
            (netInfo.address.startsWith('192.168.') ||
             netInfo.address.startsWith('10.') ||
             (netInfo.address.startsWith('172.') &&
              parseInt(netInfo.address.split('.')[1]) >= 16 &&
              parseInt(netInfo.address.split('.')[1]) <= 31))) {
          return netInfo.address;
        }
      }
    }
  }
  return 'localhost'; // fallback
};

// Connect to database and start server
const PORT = parseInt(process.env.PORT || '3000', 10);
// In development, listen on all interfaces (0.0.0.0) to accept connections from network
const HOST = '0.0.0.0';

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins();
      
      // Allow requests with no origin (mobile apps, Postman, same-origin)
      if (!origin) {
        callback(null, true);
        return;
      }
      
      // Check exact match first
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      
      // In production, allow ELB health checks
      if (process.env.NODE_ENV === 'production' && origin.includes('.elb.amazonaws.com')) {
        callback(null, true);
        return;
      }
      
      // Allow local network IPs (for development and testing)
      if (origin.startsWith('http://192.168.') || origin.startsWith('http://127.') || origin.startsWith('http://10.')) {
        callback(null, true);
        return;
      }
      
      console.log('Socket.IO CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }
});

// Initialize WebSocket manager
initializeWebSocket(io);

// Cloudinary configuration is now handled above after dotenv

connectDB().then(() => {
  server.listen(PORT, HOST, () => {
    const networkIP = getNetworkIP();
    console.log(`✓ Server started on http://localhost:${PORT}`);
    console.log(`✓ Server accessible on network at http://${networkIP}:${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ WebSocket server listening on ws://${networkIP}:${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
