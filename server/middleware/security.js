const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://drive.google.com"],
      connectSrc: ["'self'", "https://api.cloudinary.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Rate limiting configurations
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      // #region agent log
      const { emitAgentIngest } = require('../debugLog');
      emitAgentIngest({
        sessionId: '97296c',
        location: 'security.js:rateLimit',
        message: 'rate_limit_429',
        data: { path: req.path },
        timestamp: Date.now(),
        hypothesisId: 'rate_limit',
      });
      // #endregion
      res.status(429).json({
        success: false,
        message: message || 'Too many requests from this IP, please try again later.'
      });
    }
  });
};

// General rate limiting (teacher SPAs + multi-image uploads need headroom)
const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  400, // 400 requests
  'Too many requests from this IP, please try again later.'
);

// Moderate rate limiting for auth endpoints (10 requests per 15 minutes)
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // 10 requests (reasonable limit)
  'Too many login attempts, please try again later.'
);

// Exam submission rate limiting (10 submissions per hour)
const examSubmissionLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 submissions
  'Too many exam submissions, please try again later.'
);

// API rate limiting (stacked with general; allow busy authenticated sessions)
const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  800, // 800 requests
  'API rate limit exceeded, please try again later.'
);

// MongoDB injection protection
const mongoSanitizer = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`MongoDB injection attempt detected: ${key} in ${req.url}`);
  }
});

// HTTP Parameter Pollution protection
const hppProtection = hpp();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',  // Development only
      'http://localhost:3001',  // Development only
      'https://quantitative-qudrat.cloud',
      'https://www.quantitative-qudrat.cloud'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Security logging middleware
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log suspicious activities
  const suspiciousPatterns = [
    /script/i,
    /javascript/i,
    /vbscript/i,
    /onload/i,
    /onerror/i,
    /eval/i,
    /expression/i,
    /<script/i,
    /<\/script/i
  ];
  
  const checkSuspicious = (obj, path = '') => {
    if (typeof obj === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(obj)) {
          console.warn(`Suspicious content detected in ${path}: ${obj.substring(0, 100)}`);
          break;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        checkSuspicious(obj[key], `${path}.${key}`);
      }
    }
  };
  
  // Check request body and query parameters
  checkSuspicious(req.body, 'body');
  checkSuspicious(req.query, 'query');
  checkSuspicious(req.params, 'params');
  
  // Only log slow requests or errors in production
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    // Only log if request is slow (>1000ms) or error status
    if (duration > 1000 || res.statusCode >= 400) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
      }
    }
    originalSend.call(this, data);
  };
  
  next();
};

// Request size limiting middleware
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large'
    });
  }
  
  next();
};

module.exports = {
  securityHeaders,
  generalLimiter,
  authLimiter,
  examSubmissionLimiter,
  apiLimiter,
  mongoSanitizer,
  hppProtection,
  corsOptions,
  securityLogger,
  requestSizeLimiter
};
