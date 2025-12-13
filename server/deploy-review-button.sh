#!/bin/bash

echo "🚀 Starting deployment for Review button..."
echo ""

# Step 1: Pull latest code
echo "📥 Step 1: Pulling latest code from GitHub..."
cd /root/Qudrat
git fetch origin
git reset --hard origin/main
if [ $? -ne 0 ]; then
    echo "❌ Git pull failed!"
    exit 1
fi
echo "✅ Code pulled successfully"
echo ""

# Step 2: Remove old build
echo "🗑️  Step 2: Removing old build files..."
rm -rf client/build
rm -rf client/node_modules/.cache
echo "✅ Old build removed"
echo ""

# Step 3: Fix permissions
echo "🔧 Step 3: Fixing permissions..."
cd client
chmod -R +x node_modules/.bin 2>/dev/null || true
echo "✅ Permissions fixed"
echo ""

# Step 4: Install dependencies (if needed)
echo "📦 Step 4: Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ npm install failed!"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Step 5: Build
echo "🔨 Step 5: Building React app..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Build completed successfully"
echo ""

# Step 6: Verify Review button in build
echo "🔍 Step 6: Verifying Review button in build..."
if grep -q "Review" client/build/static/js/main.*.js 2>/dev/null; then
    echo "✅ Review button found in build!"
else
    echo "⚠️  Warning: Review button text not found in build (might be minified)"
fi

if grep -q "onToggleReview" client/build/static/js/main.*.js 2>/dev/null; then
    echo "✅ onToggleReview handler found in build!"
else
    echo "⚠️  Warning: onToggleReview not found in build (might be minified)"
fi
echo ""

# Step 7: Restart server
echo "🔄 Step 7: Restarting PM2..."
cd /root/Qudrat
pm2 restart all
if [ $? -ne 0 ]; then
    echo "❌ PM2 restart failed!"
    exit 1
fi
echo "✅ Server restarted"
echo ""

# Step 8: Show build info
echo "📊 Step 8: Build information:"
BUILD_FILE=$(ls -t client/build/static/js/main.*.js | head -1)
if [ -f "$BUILD_FILE" ]; then
    echo "   Build file: $(basename $BUILD_FILE)"
    echo "   Build size: $(du -h $BUILD_FILE | cut -f1)"
    echo "   Build date: $(stat -c %y $BUILD_FILE | cut -d' ' -f1,2)"
else
    echo "   ⚠️  Build file not found!"
fi
echo ""

echo "✅ Deployment completed!"
echo ""
echo "🌐 Next steps:"
echo "   1. Clear your browser cache (Ctrl+Shift+Delete)"
echo "   2. Hard refresh the page (Ctrl+F5)"
echo "   3. Check browser console for any errors"
echo "   4. Look for the blue 'Review' button below answer options"
echo ""

