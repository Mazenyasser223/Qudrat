const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User schema (simplified version)
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  role: {
    type: String,
    enum: ['teacher', 'student', 'admin'],
    default: 'student'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qudrat');
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
