import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from localhost, local network IPs, and Expo
    const allowedOrigins = [
      'http://localhost:8081',
      'http://192.168.1.118:8081',
      'http://127.0.0.1:8081',
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://192.168.')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
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
