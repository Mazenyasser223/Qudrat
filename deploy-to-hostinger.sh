#!/bin/bash

# Hostinger VPS Deployment Script for Qudrat Application
# Run this script on your VPS: bash deploy-to-hostinger.sh

echo "🚀 Starting Qudrat Application Deployment on Hostinger VPS..."

# Step 1: Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Step 2: Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Step 3: Install PM2 and other tools
echo "📦 Installing PM2 and tools..."
npm install -g pm2
apt install nginx git -y

# Step 4: Clone repository
echo "📦 Cloning repository..."
git clone https://github.com/Mazenyasser223/Qudrat.git
cd Qudrat/server

# Step 5: Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Step 6: Create environment file template
echo "📦 Creating environment file..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
MONGODB_URI=your-mongodb-atlas-uri
JWT_SECRET=your-jwt-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
EOF

echo "✅ Environment file created! Please edit it with your actual values:"
echo "   nano .env"
echo ""
echo "📝 Required environment variables:"
echo "   - MONGODB_URI: Your MongoDB Atlas connection string"
echo "   - JWT_SECRET: Your JWT secret key"
echo "   - CLOUDINARY_CLOUD_NAME: Your Cloudinary cloud name"
echo "   - CLOUDINARY_API_KEY: Your Cloudinary API key"
echo "   - CLOUDINARY_API_SECRET: Your Cloudinary API secret"
echo ""
echo "🔧 After editing .env file, run these commands:"
echo "   pm2 start index.js --name 'qudrat-api'"
echo "   pm2 startup"
echo "   pm2 save"
echo "   pm2 status"
echo ""
echo "🌐 Your application will be available at:"
echo "   http://62.72.29.136:5000"
echo ""
echo "🎉 Deployment script completed!"
