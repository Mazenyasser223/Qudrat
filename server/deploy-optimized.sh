#!/bin/bash

echo "🚀 Starting optimized deployment..."
echo ""

# Step 1: Pull latest code
echo "📥 Step 1: Pulling latest code from GitHub..."
cd /root/Qudrat
git fetch origin
git reset --hard origin/main
echo "✅ Code pulled successfully"
echo ""

# Step 2: Clean old build
echo "🗑️  Step 2: Removing old build..."
rm -rf client/build
echo "✅ Old build removed"
echo ""

# Step 3: Install dependencies (only if package.json changed)
echo "📦 Step 3: Checking dependencies..."
cd client
if [ package.json -nt node_modules ]; then
    npm install --production
    echo "✅ Dependencies updated"
else
    echo "✅ Dependencies up to date"
fi
echo ""

# Step 4: Build with optimizations
echo "🔨 Step 4: Building React app..."
GENERATE_SOURCEMAP=false DISABLE_ESLINT_PLUGIN=true npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Build completed successfully"
echo ""

# Step 5: Clean up old files in production directory
echo "🧹 Step 5: Cleaning old files..."
cd /var/www/qudrat/static/js
ls -t main.*.js 2>/dev/null | tail -n +3 | xargs rm -f 2>/dev/null
cd /var/www/qudrat/static/css
ls -t main.*.css 2>/dev/null | tail -n +3 | xargs rm -f 2>/dev/null
echo "✅ Old files cleaned"
echo ""

# Step 6: Copy new build
echo "📋 Step 6: Deploying new build..."
cp -r /root/Qudrat/client/build/* /var/www/qudrat/
echo "✅ Build deployed"
echo ""

# Step 7: Restart services
echo "🔄 Step 7: Restarting services..."
pm2 restart all
systemctl reload nginx
echo "✅ Services restarted"
echo ""

# Step 8: Show build info
echo "📊 Step 8: Build information:"
BUILD_FILE=$(ls -t /var/www/qudrat/static/js/main.*.js | head -1)
if [ -f "$BUILD_FILE" ]; then
    echo "   Build file: $(basename $BUILD_FILE)"
    echo "   Build size: $(du -h $BUILD_FILE | cut -f1)"
    echo "   Build date: $(stat -c %y $BUILD_FILE | cut -d' ' -f1,2)"
fi
echo ""

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Next steps:"
echo "   1. Clear browser cache (Ctrl+Shift+Delete)"
echo "   2. Hard refresh (Ctrl+F5)"
echo "   3. Test the website"
echo ""
