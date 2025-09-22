# 🏠 Complete Hostinger Deployment Guide

## 🎯 **Step-by-Step Deployment Process**

### **Step 1: Buy Hostinger VPS Business Plan**
1. Go to [hostinger.com](https://hostinger.com)
2. Choose **VPS Business Plan** ($3.99/month)
3. Select **Ubuntu 20.04** or **Ubuntu 22.04**
4. Choose a location close to your users
5. Complete the purchase

### **Step 2: Get Your VPS Details**
After purchase, you'll receive:
- **Server IP Address**: `xxx.xxx.xxx.xxx`
- **Root Password**: `your-password`
- **SSH Access**: `ssh root@your-server-ip`

### **Step 3: Connect to Your VPS**
```bash
# Open terminal/command prompt
ssh root@your-server-ip
# Enter your root password when prompted
```

### **Step 4: Setup Server Environment**
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install Nginx for reverse proxy
apt install nginx -y

# Install Git
apt install git -y

# Install Certbot for SSL
apt install certbot python3-certbot-nginx -y
```

### **Step 5: Deploy Your Application**
```bash
# Clone your repository
git clone https://github.com/your-username/qudrat.git
cd qudrat/server

# Install dependencies
npm install --production

# Create environment file
nano .env
```

### **Step 6: Environment Variables**
Add these to your `.env` file:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your-mongodb-atlas-uri
JWT_SECRET=your-jwt-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
```

### **Step 7: Configure Nginx**
```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/qudrat-api
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com api.your-domain.com;

    # Backend API
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **Step 8: Enable Site and Start Services**
```bash
# Enable the site
ln -s /etc/nginx/sites-available/qudrat-api /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

# Start your application with PM2
pm2 start index.js --name "qudrat-api"

# Save PM2 configuration
pm2 startup
pm2 save
```

### **Step 9: Setup SSL Certificate**
```bash
# Get SSL certificate
certbot --nginx -d your-domain.com -d api.your-domain.com

# Test automatic renewal
certbot renew --dry-run
```

### **Step 10: Update Vercel Configuration**
Update your `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://api.your-domain.com/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "REACT_APP_API_URL": "https://api.your-domain.com"
  }
}
```

### **Step 11: Deploy Frontend to Vercel**
```bash
# In your client directory
cd ../client
npm run build
git add .
git commit -m "Update API URL for Hostinger"
git push
```

## 🔧 **Performance Optimizations**

### **PM2 Configuration**
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'qudrat-api',
    script: 'index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
```

### **Nginx Caching**
Add to your Nginx config:
```nginx
# Add caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

location /api/exams {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    proxy_pass http://localhost:5000;
}
```

## 📊 **Testing Performance**

### **Test These Operations:**
1. **Students Panel**: Open teacher dashboard → Students
2. **Exam Submission**: Take an exam and submit
3. **Exam Loading**: Open individual exams
4. **Real-time Updates**: Check Socket.IO functionality

### **Performance Monitoring**
```bash
# Monitor PM2 processes
pm2 monit

# Check Nginx logs
tail -f /var/log/nginx/access.log

# Check application logs
pm2 logs qudrat-api
```

## 🚀 **Expected Results**

### **Performance Improvements:**
- **Students Panel**: 70-90% faster
- **Exam Submission**: 30-50% faster
- **Overall Response**: 40-60% faster
- **No Cold Starts**: 100% elimination

### **Monitoring Commands:**
```bash
# Check server resources
htop

# Check PM2 status
pm2 status

# Check Nginx status
systemctl status nginx

# Check disk space
df -h
```

## 🔄 **Rollback Plan**

If you need to rollback:
1. **Update Vercel config** to point back to Railway
2. **Keep Railway running** during transition
3. **Cancel Hostinger** (30-day money-back guarantee)

## 🎯 **Next Steps After Deployment**

1. **Test all operations** and note performance
2. **Identify any remaining slow operations**
3. **Apply additional optimizations** as needed
4. **Monitor server performance** and scale if necessary

## 💡 **Pro Tips**

- **Keep Railway running** as backup during testing
- **Monitor server resources** with `htop`
- **Check logs regularly** for any errors
- **Test from different locations** to verify performance
- **Use PM2 monitoring** to track performance metrics

## 🎉 **You're Ready to Deploy!**

Follow these steps and you'll have a much faster application running on Hostinger. The performance improvements should be immediately noticeable!
