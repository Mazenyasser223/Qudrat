const crypto = require('crypto');

// Security configuration
const securityConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'qudrat-app',
    audience: process.env.JWT_AUDIENCE || 'qudrat-users'
  },
  
  // Password Configuration
  password: {
    minLength: 6,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    bcryptRounds: 12
  },
  
  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  },
  
  // Rate Limiting Configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: {
      general: 100,
      auth: 5,
      api: 200,
      examSubmission: 10
    },
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  
  // CORS Configuration
  cors: {
    allowedOrigins: [
      'http://localhost:3000',  // Development only
      'http://localhost:3001',  // Development only
      'https://quantitative-qudrat.cloud',
      'https://www.quantitative-qudrat.cloud'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers'
    ]
  },
  
  // Security Headers
  headers: {
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
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    }
  },
  
  // File Upload Security
  fileUpload: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    scanForMalware: false, // Set to true if you have antivirus integration
    quarantinePath: './quarantine'
  },
  
  // Database Security
  database: {
    connectionTimeout: 30000,
    socketTimeout: 30000,
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true
  },
  
  // Logging Configuration
  logging: {
    logLevel: process.env.LOG_LEVEL || 'info',
    logFile: process.env.LOG_FILE || './logs/app.log',
    maxLogSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    logSecurityEvents: true,
    logFailedLogins: true,
    logSuspiciousActivity: true
  },
  
  // Monitoring Configuration
  monitoring: {
    enableHealthChecks: true,
    healthCheckInterval: 30000, // 30 seconds
    enableMetrics: true,
    metricsEndpoint: '/api/metrics',
    enableAlerts: true,
    alertThresholds: {
      errorRate: 0.05, // 5%
      responseTime: 5000, // 5 seconds
      memoryUsage: 0.8 // 80%
    }
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
  securityConfig.session.secure = true;
  securityConfig.cors.allowedOrigins = [
    'https://quantitative-qudrat.cloud',
    'https://www.quantitative-qudrat.cloud'
  ];
  securityConfig.logging.logLevel = 'warn';
} else if (process.env.NODE_ENV === 'development') {
  securityConfig.rateLimit.maxRequests.general = 1000;
  securityConfig.rateLimit.maxRequests.api = 1000;
  securityConfig.logging.logLevel = 'debug';
}

// Validation functions
const validateSecurityConfig = () => {
  const errors = [];
  
  // Check required environment variables
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    errors.push('JWT_SECRET environment variable is required in production');
  }
  
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    errors.push('SESSION_SECRET environment variable is required in production');
  }
  
  // Validate password requirements
  if (securityConfig.password.minLength < 6) {
    errors.push('Password minimum length must be at least 6 characters');
  }
  
  if (securityConfig.password.bcryptRounds < 10) {
    errors.push('Bcrypt rounds must be at least 10 for security');
  }
  
  // Validate rate limiting
  if (securityConfig.rateLimit.maxRequests.auth > 10) {
    errors.push('Auth rate limit should not exceed 10 requests per window');
  }
  
  if (errors.length > 0) {
    console.error('Security configuration validation failed:');
    errors.forEach(error => console.error(`- ${error}`));
    throw new Error('Invalid security configuration');
  }
  
  console.log('✅ Security configuration validated successfully');
};

// Initialize security configuration
const initializeSecurity = () => {
  try {
    validateSecurityConfig();
    console.log('🔒 Security configuration initialized');
    return securityConfig;
  } catch (error) {
    console.error('❌ Security configuration initialization failed:', error.message);
    process.exit(1);
  }
};

module.exports = {
  securityConfig,
  validateSecurityConfig,
  initializeSecurity
};
