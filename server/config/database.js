const mongoose = require('mongoose');

const connectDB = async () => {
  try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qudrat-platform', {
          // Performance optimizations
          maxPoolSize: 10, // Maintain up to 10 socket connections
          serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
          socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
          bufferCommands: false, // Disable mongoose buffering
          // Connection pooling
          minPoolSize: 2, // Maintain a minimum of 2 socket connections
          maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
          // Retry logic
          retryWrites: true,
          retryReads: true,
        });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
