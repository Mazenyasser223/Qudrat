# Fix Dark Mode Button Deployment

## Problem
The dark mode button isn't showing because git pull failed due to build file conflicts.

## Solution: Deploy with Latest Code

Run these commands on your server:

```bash
# 1. Navigate to project
cd /root/Qudrat

# 2. Remove build files that are causing conflicts
rm -rf client/build/*

# 3. Stash any local changes
git stash

# 4. Pull latest code (including dark mode button)
git pull origin main

# 5. Go to client directory
cd client

# 6. Build with latest code
DISABLE_ESLINT_PLUGIN=true npm run build

# 7. Copy to production
cp -r build/* /var/www/qudrat/

# 8. Restart services
pm2 restart all
systemctl reload nginx
```

## Verify
After deployment, visit: https://www.quantitative-qudrat.cloud

The dark mode button should appear in the header (top right) as a Moon icon button.
