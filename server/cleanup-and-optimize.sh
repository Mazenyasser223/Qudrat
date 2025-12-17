#!/bin/bash

echo "🧹 Starting cleanup and optimization..."
echo ""

# 1. Clean up old build files (keep only 2 most recent)
echo "📦 Step 1: Cleaning up old build files..."
cd /var/www/qudrat/static/js
OLD_JS_COUNT=$(ls -t main.*.js 2>/dev/null | wc -l)
if [ $OLD_JS_COUNT -gt 2 ]; then
    echo "   Found $OLD_JS_COUNT JS files, keeping 2 most recent..."
    ls -t main.*.js | tail -n +3 | xargs rm -f
    echo "   ✅ Deleted $(($OLD_JS_COUNT - 2)) old JS files"
else
    echo "   ✅ No old JS files to clean"
fi

cd /var/www/qudrat/static/css
OLD_CSS_COUNT=$(ls -t main.*.css 2>/dev/null | wc -l)
if [ $OLD_CSS_COUNT -gt 2 ]; then
    echo "   Found $OLD_CSS_COUNT CSS files, keeping 2 most recent..."
    ls -t main.*.css | tail -n +3 | xargs rm -f
    echo "   ✅ Deleted $(($OLD_CSS_COUNT - 2)) old CSS files"
else
    echo "   ✅ No old CSS files to clean"
fi

# 2. Clean up old map files
echo ""
echo "🗺️  Step 2: Cleaning up source map files..."
cd /var/www/qudrat/static/js
MAP_COUNT=$(ls -t main.*.js.map 2>/dev/null | wc -l)
if [ $MAP_COUNT -gt 2 ]; then
    ls -t main.*.js.map | tail -n +3 | xargs rm -f
    echo "   ✅ Deleted $(($MAP_COUNT - 2)) old map files"
else
    echo "   ✅ No old map files to clean"
fi

# 3. Check disk space saved
echo ""
echo "💾 Step 3: Disk space report..."
STATIC_SIZE=$(du -sh /var/www/qudrat/static/ | cut -f1)
echo "   Current static folder size: $STATIC_SIZE"

# 4. Clean npm cache in build directory
echo ""
echo "🗑️  Step 4: Cleaning build caches..."
rm -rf /root/Qudrat/client/node_modules/.cache
echo "   ✅ Build cache cleared"

# 5. Clean old logs if PM2 is being used
echo ""
echo "📋 Step 5: Cleaning old PM2 logs..."
if command -v pm2 &> /dev/null; then
    pm2 flush
    echo "   ✅ PM2 logs flushed"
else
    echo "   ⏭️  PM2 not found, skipping"
fi

# 6. Summary
echo ""
echo "✅ Cleanup completed!"
echo ""
echo "📊 Summary:"
du -sh /var/www/qudrat/static/js
du -sh /var/www/qudrat/static/css
echo ""
