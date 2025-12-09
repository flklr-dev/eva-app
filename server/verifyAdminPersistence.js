require('dotenv').config();
const mongoose = require('mongoose');

const verifyAdminPersistence = async () => {
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

    // Check initial state
    console.log('\n--- Initial State ---');
    const initialAdmin = await Admin.findOne({ email: 'admin@eva.com' });
    if (initialAdmin) {
      console.log('Admin found:');
      console.log('- Email:', initialAdmin.email);
      console.log('- isFirstLogin:', initialAdmin.isFirstLogin);
      console.log('- Created at:', initialAdmin.createdAt);
      console.log('- Updated at:', initialAdmin.updatedAt);
    } else {
      console.log('Admin not found');
      await mongoose.connection.close();
      return;
    }

    // Simulate a password change
    console.log('\n--- Simulating Password Change ---');
    initialAdmin.isFirstLogin = false;
    initialAdmin.password = 'newTestPassword123';
    await initialAdmin.save();

    console.log('Admin updated in database');

    // Verify the change was persisted
    console.log('\n--- Verifying Persistence ---');
    const updatedAdmin = await Admin.findOne({ email: 'admin@eva.com' });
    if (updatedAdmin) {
      console.log('Updated admin found:');
      console.log('- Email:', updatedAdmin.email);
      console.log('- isFirstLogin:', updatedAdmin.isFirstLogin);
      console.log('- Created at:', updatedAdmin.createdAt);
      console.log('- Updated at:', updatedAdmin.updatedAt);
    } else {
      console.log('Updated admin not found');
    }

    // Reset to original state for testing purposes
    console.log('\n--- Resetting to Original State ---');
    updatedAdmin.isFirstLogin = true;
    await updatedAdmin.save();
    console.log('Admin reset to original state');

    await mongoose.connection.close();
    console.log('\n✓ Test completed successfully');
  } catch (error) {
    console.error('Error verifying admin persistence:', error);
    process.exit(1);
  }
};

verifyAdminPersistence();