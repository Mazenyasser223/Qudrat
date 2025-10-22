const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import security middleware
const {
  securityHeaders,
  generalLimiter,
  examSubmissionLimiter,
  apiLimiter,
  mongoSanitizer,
  hppProtection,
  corsOptions,
  securityLogger,
  requestSizeLimiter
} = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const examRoutes = require('./routes/exams');
const examGroupRoutes = require('./routes/examGroups');
const adminRoutes = require('./routes/admin');
const reviewRoutes = require('./routes/reviews');

// Connect to database
connectDB();

const app = express();

// Trust proxy for rate limiting and security
app.set('trust proxy', 1);

// Security middleware (order matters!)
app.use(securityHeaders);
app.use(requestSizeLimiter);
app.use(mongoSanitizer);
app.use(hppProtection);
app.use(securityLogger);

// CORS middleware with security
app.use(cors(corsOptions));

// Rate limiting with security
// Removed authLimiter to allow unlimited login attempts
app.use('/api/exams/submit', examSubmissionLimiter);
app.use('/api', apiLimiter);
app.use(generalLimiter);

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/exam-groups', examGroupRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Security: Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = createServer(app);

// Socket.IO setup with security
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = [
        'http://localhost:3000',  // Development only
        'http://localhost:3001',  // Development only
        'https://quantitative-qudrat.cloud',
        'https://www.quantitative-qudrat.cloud'
      ];
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`Socket.IO CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket.IO authentication middleware - DISABLED FOR NOW
// io.use((socket, next) => {
//   const token = socket.handshake.auth.token;
//   
//   if (!token) {
//     return next(new Error('Authentication error: No token provided'));
//   }
//   
//   // Verify JWT token here if needed
//   // For now, we'll allow all authenticated connections
//   next();
// });

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Join exam room
  socket.on('join-exam', (examId) => {
    socket.join(`exam-${examId}`);
    console.log(`User ${socket.id} joined exam ${examId}`);
  });
  
  // Leave exam room
  socket.on('leave-exam', (examId) => {
    socket.leave(`exam-${examId}`);
    console.log(`User ${socket.id} left exam ${examId}`);
  });
  
  // Handle exam updates
  socket.on('exam-update', (data) => {
    socket.to(`exam-${data.examId}`).emit('exam-updated', data);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔒 Security middleware enabled`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = { app, server, io };
