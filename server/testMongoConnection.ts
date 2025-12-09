import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testConnection = async () => {
  try {
    console.log('Testing MongoDB connection...');
    console.log('Using URI:', process.env.MONGODB_URI);
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    });
    
    console.log('✓ MongoDB Connected Successfully');
    console.log('Database name:', mongoose.connection.name);
    
    await mongoose.connection.close();
    console.log('✓ Connection closed');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    console.error('Error code:', (error as any).code);
    console.error('Error message:', (error as any).message);
  }
};

testConnection();