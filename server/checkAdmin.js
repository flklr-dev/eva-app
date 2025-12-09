require('dotenv').config();
const mongoose = require('mongoose');

const checkAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✓ MongoDB Connected Successfully');

    // Define the Admin schema directly
    const { Schema } = mongoose;
    const adminSchema = new Schema({
      name: String,
      email: String,
      password: String,
      isFirstLogin: Boolean,
      createdAt: Date,
      updatedAt: Date
    }, { timestamps: true });

    const Admin = mongoose.model('Admin', adminSchema);

    // Find admin user
    const admin = await Admin.findOne({ email: 'admin@eva.com' });
    if (admin) {
      console.log('Admin found:');
      console.log('- Email:', admin.email);
      console.log('- isFirstLogin:', admin.isFirstLogin);
      console.log('- Created at:', admin.createdAt);
      console.log('- Updated at:', admin.updatedAt);
    } else {
      console.log('Admin not found');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error checking admin user:', error);
    process.exit(1);
  }
};

checkAdmin();