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
import activityRoutes from './routes/activityRoutes';
import sosRoutes from './routes/sosRoutes';

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
// Note: We configure helmet to allow the invite page to work properly
app.use((req, res, next) => {
  // Skip helmet for invite routes - they need inline scripts for copy functionality
  if (req.path.startsWith('/invite/')) {
    return next();
  }
  helmet()(req, res, next);
});
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
  try {
    const User = require('./models/User').default;
    const user = await User.findById(userId).select('name email');
    if (user) {
      userName = user.name || 'Friend';
      console.log('✓ User details fetched for invite page:', userName);
    }
  } catch (error) {
    console.log('⚠ Could not fetch user details for invite page, using default');
  }

  // Custom scheme deep link for standalone/production builds
  const customSchemeLink = `eva-alert://invite/${userId}`;

  console.log('✓ Invite page generated for userId:', userId);

  // HTML page with DEEP LINK as PRIMARY, copy code as BACKUP
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Add Friend - EVA Alert</title>
        <style>
          * { box-sizing: border-box; }
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
            padding: 30px;
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
            margin-top: 12px;
            width: 100%;
            transition: transform 0.2s, opacity 0.2s;
            text-decoration: none;
            display: block;
          }
          .button:hover {
            transform: scale(1.02);
          }
          .button:active {
            transform: scale(0.98);
            opacity: 0.9;
          }
          .button-secondary {
            background: #f3f4f6;
            color: #333;
            margin-top: 10px;
          }
          .button-secondary:hover {
            background: #e5e7eb;
          }
          .code-container {
            background: #f6f7fb;
            border: 2px dashed #667eea;
            border-radius: 12px;
            padding: 16px;
            margin: 20px 0 10px 0;
            cursor: pointer;
            transition: all 0.2s;
          }
          .code-container:hover {
            background: #eef0f5;
            border-style: solid;
          }
          .code-container:active {
            transform: scale(0.98);
          }
          .code-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 14px;
            font-weight: 600;
            color: #333;
            word-break: break-all;
          }
          .status {
            margin-top: 12px;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
          }
          .status.success {
            background: #ecfdf5;
            color: #059669;
          }
          .status.info {
            background: #eff6ff;
            color: #1d4ed8;
          }
          .instructions {
            background: #fafafa;
            border-radius: 12px;
            padding: 16px;
            margin-top: 20px;
            text-align: left;
          }
          .step {
            display: flex;
            align-items: flex-start;
            margin-bottom: 12px;
          }
          .step:last-child {
            margin-bottom: 0;
          }
          .step-number {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 24px;
            height: 24px;
            background: #667eea;
            color: white;
            border-radius: 50%;
            font-size: 12px;
            font-weight: 600;
            margin-right: 12px;
          }
          .step-text {
            font-size: 14px;
            color: #374151;
            line-height: 1.5;
          }
          .hidden {
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>👥 Add Friend</h1>
          
          <div class="user-info">
            <p class="user-name">${userName}</p>
          </div>
          
          <p>Open EVA Alert to send a friend request</p>
          
          <!-- PRIMARY: Open App Button -->
          <a href="${customSchemeLink}" class="button" id="openAppBtn">
            📱 Open EVA Alert
          </a>
          
          <div class="instructions">
            <div class="step">
              <span class="step-number">1</span>
              <span class="step-text">Tap <strong>"Open EVA Alert"</strong> above</span>
            </div>
            <div class="step">
              <span class="step-number">2</span>
              <span class="step-text">The friend request will be sent automatically</span>
            </div>
          </div>
          
          <p style="margin-top: 20px; font-size: 13px; color: #9ca3af;">If the app doesn't open:</p>
          
          <!-- BACKUP: Copy Code Section -->
          <div class="code-container" id="codeBox">
            <div class="code-label">Invitation Code (tap to copy)</div>
            <div class="code" id="inviteCode">${inviteCode}</div>
          </div>
          
          <div id="status" class="status success hidden"></div>
          
          <button class="button button-secondary" id="copyBtn">
            📋 Copy Code
          </button>
        </div>
        
        <script>
          var inviteCode = '${inviteCode}';
          var statusEl = document.getElementById('status');
          var copyBtn = document.getElementById('copyBtn');
          var codeBox = document.getElementById('codeBox');
          
          function copyToClipboard() {
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(inviteCode).then(function() {
                  showCopied();
                }).catch(function() {
                  fallbackCopy();
                });
              } else {
                fallbackCopy();
              }
            } catch (e) {
              fallbackCopy();
            }
          }
          
          function fallbackCopy() {
            var textArea = document.createElement('textarea');
            textArea.value = inviteCode;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '0';
            textArea.setAttribute('readonly', '');
            document.body.appendChild(textArea);
            
            var range = document.createRange();
            range.selectNodeContents(textArea);
            var selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            textArea.setSelectionRange(0, 999999);
            
            try {
              var successful = document.execCommand('copy');
              if (successful) {
                showCopied();
              } else {
                showError();
              }
            } catch (err) {
              showError();
            }
            
            document.body.removeChild(textArea);
          }
          
          function showCopied() {
            codeBox.style.borderColor = '#059669';
            codeBox.style.background = '#ecfdf5';
            copyBtn.textContent = '✅ Copied!';
            copyBtn.style.background = '#059669';
            copyBtn.style.color = 'white';
            statusEl.className = 'status success';
            statusEl.textContent = 'Code copied! Now open EVA Alert app.';
            statusEl.classList.remove('hidden');
            
            setTimeout(function() {
              copyBtn.textContent = '📋 Copy Again';
              copyBtn.style.background = '';
              copyBtn.style.color = '';
            }, 3000);
          }
          
          function showError() {
            statusEl.className = 'status info';
            statusEl.textContent = 'Please long-press the code to copy manually.';
            statusEl.classList.remove('hidden');
          }
          
          codeBox.addEventListener('click', copyToClipboard);
          copyBtn.addEventListener('click', copyToClipboard);
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

// Activity Routes
app.use('/api/activities', activityRoutes);
console.log('✓ Activity routes registered at /api/activities');

// SOS Routes
app.use('/api/sos', sosRoutes);
console.log('✓ SOS routes registered at /api/sos');

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
