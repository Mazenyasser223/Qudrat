const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function verifyAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the admin user
    const adminUser = await User.findOne({ email: 'admin@qudrat.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('✅ Admin user found:');
    console.log('- Email:', adminUser.email);
    console.log('- Role:', adminUser.role);
    console.log('- Is Active:', adminUser.isActive);
    console.log('- Password Hash:', adminUser.password);

    // Test password verification
    const testPasswords = ['admin123', 'admin', 'password', '123456'];
    
    for (const password of testPasswords) {
      const isMatch = await bcrypt.compare(password, adminUser.password);
      console.log(`Password "${password}": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    }

    // If none match, let's create a new password
    console.log('\n🔧 Creating new password hash for "admin123"...');
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash('admin123', salt);
    console.log('New hash:', newHash);
    
    // Update the password
    adminUser.password = newHash;
    await adminUser.save();
    console.log('✅ Password updated successfully!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

verifyAdmin();
