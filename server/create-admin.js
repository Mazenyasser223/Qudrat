const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@qudrat.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      console.log('Is Active:', existingAdmin.isActive);
    } else {
      // Create admin user
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@qudrat.com',
        password: 'admin123', // This will be hashed automatically
        role: 'admin',
        isActive: true
      });
      
      console.log('Admin user created successfully:', admin.email);
      console.log('Role:', admin.role);
    }

    // List all users
    const allUsers = await User.find({}, 'name email role isActive');
    console.log('\nAll users in database:');
    allUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role} - Active: ${user.isActive}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

createAdmin();