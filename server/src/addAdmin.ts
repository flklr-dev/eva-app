import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin';

// Load environment variables
dotenv.config();

const addAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✓ MongoDB Connected Successfully');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'support@eva.com' });
    if (existingAdmin) {
      console.log('⚠ Support admin user already exists');
      await mongoose.connection.close();
      return;
    }

    // Get admin password from environment variables
    const adminPassword = process.env.SUPPORT_ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error('SUPPORT_ADMIN_PASSWORD is not defined in environment variables');
    }

    // Create support admin user
    const admin = new Admin({
      username: 'support',
      email: 'support@eva.com',
      password: adminPassword, // Password from environment variable
      firstName: 'Support',
      lastName: 'Team',
      mustChangePassword: true, // Force password change on first login
    });

    await admin.save();
    console.log('✓ Support admin user created successfully');
    console.log('Email: support@eva.com');
    console.log('⚠ Password set from SUPPORT_ADMIN_PASSWORD environment variable');
    console.log('⚠ IMPORTANT: Ensure this password is strong and change it periodically!');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error adding support admin user:', error);
    process.exit(1);
  }
};

addAdmin();