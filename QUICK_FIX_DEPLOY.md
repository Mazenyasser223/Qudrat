# 🚨 URGENT: Quick Fix Deployment Guide

## Problem
The website is showing an error because the server has an old build without the `useMemo` import fix.

## Solution: Deploy Latest Code NOW

### Step 1: SSH into your server
```bash
ssh root@62.72.29.136
```

### Step 2: Pull latest code and rebuild
```bash
cd /root/Qudrat

# Pull latest code (includes the useMemo fix)
git pull origin main

# Go to client directory
cd client

# Build with ESLint disabled
DISABLE_ESLINT_PLUGIN=true npm run build

# Copy new build to production
cp -r build/* /var/www/qudrat/

# Restart services
pm2 restart all
systemctl reload nginx
```

### Step 3: Verify
1. Visit: https://www.quantitative-qudrat.cloud/student
2. Hard refresh: Ctrl+F5
3. Should work now!

---

## Alternative: Use the deployment script
```bash
cd /root/Qudrat
git pull origin main
bash server/deploy-optimized.sh
```

---

## If still not working, check:
1. **Server logs**: `pm2 logs`
2. **Nginx logs**: `tail -f /var/log/nginx/error.log`
3. **Browser console**: F12 → Console tab for JavaScript errors
