const NodeCache = require('node-cache');

// Create cache instance with 5 minute TTL
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false // Don't clone objects for better performance
});

// Cache middleware
const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from URL and query params
    const key = `${req.originalUrl}_${JSON.stringify(req.query)}`;
    
    // Check if data exists in cache
    const cachedData = cache.get(key);
    if (cachedData) {
      console.log(`Cache hit for key: ${key}`);
      return res.json(cachedData);
    }

    // Store original res.json method
    const originalJson = res.json;
    
    // Override res.json to cache the response
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cache.set(key, data, duration);
        console.log(`Cached data for key: ${key}`);
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// Cache invalidation helper
const invalidateCache = (pattern) => {
  const keys = cache.keys();
  const keysToDelete = keys.filter(key => key.includes(pattern));
  
  if (keysToDelete.length > 0) {
    cache.del(keysToDelete);
    console.log(`Invalidated ${keysToDelete.length} cache entries for pattern: ${pattern}`);
  }
};

// Clear all cache
const clearCache = () => {
  cache.flushAll();
  console.log('All cache cleared');
};

module.exports = {
  cache,
  cacheMiddleware,
  invalidateCache,
  clearCache
};
