// Copy this file to .env in the server directory and update the values

module.exports = {
  // MongoDB Atlas Configuration
  MONGODB_URI: 'mongodb+srv://your-username:your-password@your-cluster.mongodb.net/qudrat-platform?retryWrites=true&w=majority',
  
  // JWT Configuration
  JWT_SECRET: 'your-super-secret-jwt-key-change-this-in-production',
  JWT_EXPIRE: '7d',
  
  // Server Configuration
  PORT: 5000,
  NODE_ENV: 'development',
  
  // Client URL for CORS
  CLIENT_URL: 'http://localhost:3000',
  
  // File Upload Configuration
  MAX_FILE_SIZE: 10485760,
  UPLOAD_PATH: 'uploads/questions'
};
