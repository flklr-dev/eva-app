import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import adminAuthRoutes from './routes/adminAuthRoutes';
import notificationRoutes from './routes/notifications';

// Load environment variables
dotenv.config();

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
    
    // In development, allow local network IPs
    if (process.env.NODE_ENV !== 'production' && 
        (origin.startsWith('http://192.168.') || origin.startsWith('http://127.'))) {
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

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Auth Routes
app.use('/api/auth', authRoutes);

// Notification Routes
app.use('/api/notifications', notificationRoutes);

// Admin Auth Routes
app.use('/api/admin/auth', adminAuthRoutes);

// Connect to database and start server
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✓ Server started on http://localhost:${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
