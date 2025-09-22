#!/bin/bash

# Production Environment Setup Script for Hostinger VPS
# Run this script on your VPS to set up environment variables

echo "🚀 Setting up production environment variables..."

# Create .env file for production
cat > /root/Qudrat/server/.env << 'EOF'
# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://mazenyasser223:Qudrat2024@qudrat.8qzkxzj.mongodb.net/qudrat-platform?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secure-production-jwt-secret-key-change-this
JWT_EXPIRE=7d

# Server Configuration
PORT=5000
NODE_ENV=production

# Client URL for CORS
CLIENT_URL=https://qudrat-five.vercel.app/

# Cloudinary Configuration (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=uploads/questions
EOF

echo "✅ Environment variables set up successfully!"
echo "📝 Please update the following values in /root/Qudrat/server/.env:"
echo "   - JWT_SECRET: Change to a secure random string"
echo "   - CLOUDINARY_CLOUD_NAME: Your Cloudinary cloud name"
echo "   - CLOUDINARY_API_KEY: Your Cloudinary API key"
echo "   - CLOUDINARY_API_SECRET: Your Cloudinary API secret"

echo "🔄 Restarting PM2 to apply changes..."
pm2 restart qudrat-api

echo "✅ Setup complete!"

