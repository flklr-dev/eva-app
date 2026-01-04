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
import deviceRoutes from './routes/device';

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

// Universal Links / App Links Support
// Apple App Site Association (AASA) file for Universal Links
// IMPORTANT: Replace 'TEAM_ID' with your Apple Developer Team ID
// Get it from: https://developer.apple.com/account
app.get('/.well-known/apple-app-site-association', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  // Remove cache headers that might prevent iOS from reading this file
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  res.json({
    applinks: {
      apps: [],
      details: [
        {
          // TODO: Replace 'TEAM_ID' with your actual Apple Team ID
          // Format: TEAM_ID.com.eva.alert
          // Example: ABC123DEF4.com.eva.alert
          appID: 'TEAM_ID.com.eva.alert',
          paths: [
            '/invite/*',
            '/user/*'
          ]
        }
      ]
    }
  });
});

// Android Asset Links for App Links verification
// IMPORTANT: Add your app's SHA256 certificate fingerprint
// Get it from: keytool -list -v -keystore your-keystore.jks
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.eva.alert',
        sha256_cert_fingerprints: [
          // TODO: Add your app's SHA256 fingerprint here
          // For debug builds: keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
          // For production: keytool -list -v -keystore your-production-keystore.jks -alias your-key-alias
          // Example: 'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99'
        ]
      }
    }
  ]);
});

// Invite route - serves HTML page for QR code scanning
// This allows iPhone Camera to recognize the QR code as a valid URL
// With Universal Links configured, tapping this URL will open the app directly
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

  // HTML page with clean, minimal design matching app UI
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Add Friend - EVA Alert</title>
        <style>
          * { 
            box-sizing: border-box; 
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Helvetica', 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 24px;
            background: #F8FAFC;
            color: #111827;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          .container {
            background: #FFFFFF;
            border-radius: 20px;
            padding: 32px 24px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            text-align: center;
          }
          .brand {
            font-size: 48px;
            font-weight: 700;
            color: #4B5563;
            letter-spacing: 2px;
            margin-bottom: 24px;
            font-family: 'Helvetica', sans-serif;
          }
          .title {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
          }
          .subtitle {
            font-size: 14px;
            color: #6B7280;
            margin-bottom: 24px;
            line-height: 1.5;
          }
          .user-card {
            background: #F3F4F6;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
            border: 1px solid #E5E7EB;
          }
          .user-name {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
            margin: 0;
          }
          .button {
            background: #F1F8E9;
            color: #111827;
            border: none;
            padding: 16px 24px;
            border-radius: 28px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-bottom: 16px;
            width: 100%;
            transition: opacity 0.2s, transform 0.1s;
            text-decoration: none;
            display: block;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          }
          .button:hover {
            opacity: 0.9;
          }
          .button:active {
            transform: scale(0.98);
            opacity: 0.85;
          }
          .button-secondary {
            background: #FFFFFF;
            color: #111827;
            border: 1px solid #E5E7EB;
            margin-top: 12px;
          }
          .button-secondary:hover {
            background: #F9FAFB;
          }
          .divider {
            display: flex;
            align-items: center;
            margin: 24px 0;
            color: #9CA3AF;
            font-size: 12px;
          }
          .divider::before,
          .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #E5E7EB;
          }
          .divider::before {
            margin-right: 12px;
          }
          .divider::after {
            margin-left: 12px;
          }
          .code-section {
            margin-top: 8px;
          }
          .code-label {
            font-size: 12px;
            color: #9CA3AF;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .code-container {
            background: #F9FAFB;
            border: 1.5px solid #E5E7EB;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .code-container:hover {
            background: #F3F4F6;
            border-color: #D1D5DB;
          }
          .code-container:active {
            transform: scale(0.98);
          }
          .code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            word-break: break-all;
            letter-spacing: 0.5px;
          }
          .status {
            margin-top: 12px;
            padding: 12px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            line-height: 1.4;
          }
          .status.success {
            background: #ECFDF5;
            color: #059669;
            border: 1px solid #D1FAE5;
          }
          .status.info {
            background: #EFF6FF;
            color: #1D4ED8;
            border: 1px solid #DBEAFE;
          }
          .hidden {
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="brand">EVA</div>
          
          <h1 class="title">Add Friend</h1>
          <p class="subtitle">Open EVA Alert to send a friend request</p>
          
          <div class="user-card">
            <p class="user-name">${userName}</p>
          </div>
          
          <a href="${customSchemeLink}" class="button" id="openAppBtn">
            Open EVA Alert
          </a>
          
          <p style="margin-top: 16px; font-size: 12px; color: #9CA3AF; line-height: 1.4;">
            Tap the button above to automatically open the EVA Alert app and send a friend request.
          </p>
          
          <div class="divider">OR</div>
          
          <div class="code-section">
            <div class="code-label">Invitation Code</div>
          <div class="code-container" id="codeBox">
            <div class="code" id="inviteCode">${inviteCode}</div>
          </div>
          
          <div id="status" class="status success hidden"></div>
          
          <button class="button button-secondary" id="copyBtn">
              Copy Code
          </button>
          </div>
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
            codeBox.style.borderColor = '#34C759';
            codeBox.style.background = '#ECFDF5';
            copyBtn.textContent = 'Copied!';
            copyBtn.style.background = '#34C759';
            copyBtn.style.color = '#FFFFFF';
            statusEl.className = 'status success';
            statusEl.textContent = 'Code copied! Open EVA Alert and paste the code.';
            statusEl.classList.remove('hidden');
            
            setTimeout(function() {
              copyBtn.textContent = 'Copy Code';
              copyBtn.style.background = '#FFFFFF';
              copyBtn.style.color = '#111827';
              codeBox.style.borderColor = '#E5E7EB';
              codeBox.style.background = '#F9FAFB';
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

// Device Routes
app.use('/api/devices', deviceRoutes);
console.log('✓ Device routes registered at /api/devices');

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
