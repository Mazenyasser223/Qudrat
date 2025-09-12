const mongoose = require('mongoose');
const User = require('./server/models/User');
require('dotenv').config();

async function testLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://mazenyasser223_db_user:134167@qudrat.8qzkxzj.mongodb.net/?retryWrites=true&w=majority&appName=Qudrat');
    console.log('Connected to MongoDB');

    // Find all users
    const users = await User.find({});
    console.log('All users in database:');
    users.forEach(user => {
      console.log(`- Name: ${user.name}, Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}`);
    });

    // Test login for Omar
    const testEmail = 'omar@test.com';
    const testPassword = 'password123';
    
    console.log(`\nTesting login for: ${testEmail}`);
    const user = await User.findOne({ email: testEmail }).select('+password');
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ User found: ${user.name} (${user.role})`);
    console.log(`Active: ${user.isActive}`);
    
    const isMatch = await user.comparePassword(testPassword);
    console.log(`Password match: ${isMatch ? '✅' : '❌'}`);
    
    if (isMatch) {
      console.log('🎉 Login should work!');
    } else {
      console.log('❌ Password incorrect');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testLogin();
