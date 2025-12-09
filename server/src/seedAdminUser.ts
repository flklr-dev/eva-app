import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin';

// Load environment variables
dotenv.config();

const seedAdminUser = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✓ MongoDB Connected Successfully');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@eva.com' });
    if (existingAdmin) {
      console.log('⚠ Admin user already exists');
      await mongoose.connection.close();
      return;
    }

    // Get admin password from environment variables
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error('DEFAULT_ADMIN_PASSWORD is not defined in environment variables');
    }

    // Create default admin user
    const admin = new Admin({
      username: 'admin',
      email: 'admin@eva.com',
      password: adminPassword, // Password from environment variable
      firstName: 'System',
      lastName: 'Administrator',
      mustChangePassword: true, // Force password change on first login
    });

    await admin.save();
    console.log('✓ Default admin user created successfully');
    console.log('Email: admin@eva.com');
    console.log('⚠ Password set from DEFAULT_ADMIN_PASSWORD environment variable');
    console.log('⚠ IMPORTANT: Ensure this password is strong and change it periodically!');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
};

seedAdminUser();