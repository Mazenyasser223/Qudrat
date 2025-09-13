const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function updateAdminRole() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the admin user
    const adminUser = await User.findOne({ email: 'admin@qudrat.com' });
    
    if (!adminUser) {
      console.log('Admin user not found!');
      return;
    }

    console.log('Found admin user:', adminUser.email);
    console.log('Current role:', adminUser.role);

    // Update the role to admin
    adminUser.role = 'admin';
    await adminUser.save();

    console.log('✅ Admin role updated successfully!');
    console.log('New role:', adminUser.role);

    // Verify the update
    const updatedUser = await User.findOne({ email: 'admin@qudrat.com' });
    console.log('Verification - Updated role:', updatedUser.role);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

updateAdminRole();
