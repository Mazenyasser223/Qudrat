const mongoose = require('mongoose');

async function testAtlasConnection() {
  try {
    console.log('Testing MongoDB Atlas connection...');
    
    // Use the same connection string as the server
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qudrat-platform';
    
    console.log('Connecting to:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
    
    const conn = await mongoose.connect(MONGODB_URI);
    
    console.log('✅ MongoDB Atlas Connected:', conn.connection.host);
    console.log('✅ Database Name:', conn.connection.name);
    
    // Test a simple query
    const User = mongoose.model('User', new mongoose.Schema({
      name: String,
      email: String,
      role: String
    }));
    
    const userCount = await User.countDocuments();
    console.log('✅ Total users in database:', userCount);
    
    // Test finding the admin user
    const adminUser = await User.findOne({ email: 'mazen@qudrat.com' });
    if (adminUser) {
      console.log('✅ Admin user found:', {
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role
      });
    } else {
      console.log('❌ Admin user not found');
    }
    
    await mongoose.disconnect();
    console.log('✅ Connection closed successfully');
    
  } catch (error) {
    console.log('❌ Atlas connection failed:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('🔑 Authentication issue - check username/password');
    } else if (error.message.includes('network')) {
      console.log('🌐 Network issue - check internet connection');
    } else if (error.message.includes('timeout')) {
      console.log('⏰ Connection timeout - check Atlas cluster status');
    }
  }
}

testAtlasConnection();
