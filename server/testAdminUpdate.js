require('dotenv').config();
const mongoose = require('mongoose');

const testAdminUpdate = async () => {
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
      console.log('Before update:');
      console.log('- Email:', admin.email);
      console.log('- isFirstLogin:', admin.isFirstLogin);
      console.log('- Created at:', admin.createdAt);
      console.log('- Updated at:', admin.updatedAt);

      // Update the admin
      admin.isFirstLogin = false;
      await admin.save();

      console.log('\nAfter update:');
      console.log('- Email:', admin.email);
      console.log('- isFirstLogin:', admin.isFirstLogin);
      console.log('- Created at:', admin.createdAt);
      console.log('- Updated at:', admin.updatedAt);

      // Verify the update
      const updatedAdmin = await Admin.findOne({ email: 'admin@eva.com' });
      console.log('\nVerified from database:');
      console.log('- Email:', updatedAdmin.email);
      console.log('- isFirstLogin:', updatedAdmin.isFirstLogin);
      console.log('- Created at:', updatedAdmin.createdAt);
      console.log('- Updated at:', updatedAdmin.updatedAt);
    } else {
      console.log('Admin not found');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error testing admin update:', error);
    process.exit(1);
  }
};

testAdminUpdate();