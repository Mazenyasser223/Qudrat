const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Simple user schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect('mongodb+srv://mazenyasser223:Qudrat123@cluster0.8qjqj.mongodb.net/qudrat?retryWrites=true&w=majority');
    console.log('Connected to MongoDB');

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: 'admin@qudrat.com' });
    
    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
    } else {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      // Create admin
      const admin = new User({
        name: 'Admin',
        email: 'admin@qudrat.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });
      
      await admin.save();
      console.log('Admin created successfully!');
      console.log('Email: admin@qudrat.com');
      console.log('Password: admin123');
    }

    // List all users
    const users = await User.find({}, 'name email role isActive');
    console.log('\nAll users:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

createAdmin();
