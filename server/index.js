const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const examRoutes = require('./routes/exams');
const adminRoutes = require('./routes/admin');

// Connect to database
connectDB();

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  skip: (req) => {
    // Skip rate limiting in development mode
    return process.env.NODE_ENV === 'development';
  }
});
app.use(limiter);

// CORS - Temporary permissive configuration for Railway deployment
app.use(cors({
  origin: true, // Allow all origins temporarily
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// Additional CORS headers for all responses
app.use((req, res, next) => {
  console.log('🔍 Request from origin:', req.headers.origin || 'no origin');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  next();
});

// Handle preflight requests
app.options('*', (req, res) => {
  console.log('🔄 Handling preflight request for:', req.path);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check request from:', req.headers.origin || 'no origin');
  res.json({
    success: true,
    message: 'Qudrat Educational Platform API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.1',
    cors: {
      origin: req.headers.origin || 'no origin',
      userAgent: req.headers['user-agent'] || 'no user agent'
    }
  });
});

// Public test endpoint for debugging (no auth required)
app.get('/api/test-db/:studentId/:examId', async (req, res) => {
  try {
    console.log('=== MAIN SERVER PUBLIC TEST ===');
    console.log('Student ID:', req.params.studentId);
    console.log('Exam ID:', req.params.examId);
    
    const User = require('./models/User');
    const Exam = require('./models/Exam');
    
    // Test finding the specific student
    const student = await User.findById(req.params.studentId);
    console.log('Student found:', !!student);
    console.log('Student role:', student?.role);
    console.log('Student name:', student?.name);
    
    // Test finding the specific exam
    const exam = await Exam.findById(req.params.examId);
    console.log('Exam found:', !!exam);
    console.log('Exam title:', exam?.title);
    console.log('Exam group:', exam?.examGroup);
    console.log('Exam isActive:', exam?.isActive);
    
    // Test if student has progress for this exam
    const existingProgress = student?.examProgress?.find(
      progress => progress.examId.toString() === req.params.examId
    );
    console.log('Existing progress:', !!existingProgress);
    console.log('Progress status:', existingProgress?.status);
    
    res.json({
      success: true,
      message: 'Main server public test completed',
      data: {
        student: student ? {
          id: student._id,
          name: student.name,
          role: student.role,
          examProgressCount: student.examProgress?.length || 0
        } : null,
        exam: exam ? {
          id: exam._id,
          title: exam.title,
          examGroup: exam.examGroup,
          isActive: exam.isActive
        } : null,
        existingProgress: existingProgress ? {
          status: existingProgress.status,
          examGroup: existingProgress.examGroup
        } : null
      }
    });
  } catch (error) {
    console.error('Main server public test error:', error);
    res.status(500).json({
      success: false,
      message: 'Main server public test failed',
      error: error.message
    });
  }
});

// Test save operation endpoint (no auth required)
app.post('/api/test-save/:studentId/:examId', async (req, res) => {
  try {
    console.log('=== TESTING SAVE OPERATION ===');
    console.log('Student ID:', req.params.studentId);
    console.log('Exam ID:', req.params.examId);
    
    const User = require('./models/User');
    const Exam = require('./models/Exam');
    
    // Find student and exam
    const student = await User.findById(req.params.studentId);
    const exam = await Exam.findById(req.params.examId);
    
    if (!student || !exam) {
      return res.status(404).json({
        success: false,
        message: 'Student or exam not found'
      });
    }
    
    console.log('Creating new progress entry...');
    const newProgress = {
      examGroup: exam.examGroup,
      examId: req.params.examId,
      status: 'unlocked',
      percentage: 0,
      score: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      timeSpent: 0,
      submittedAt: null,
      answers: []
    };
    
    console.log('New progress object:', newProgress);
    
    // Add to student's examProgress array
    student.examProgress.push(newProgress);
    console.log('Student examProgress after push:', student.examProgress.length);
    
    // Try to save
    console.log('Attempting to save student...');
    await student.save();
    console.log('Student saved successfully!');
    
    res.json({
      success: true,
      message: 'Save operation completed successfully',
      data: {
        studentId: student._id,
        examId: exam._id,
        newProgressCount: student.examProgress.length
      }
    });
    
  } catch (error) {
    console.error('=== SAVE OPERATION ERROR ===');
    console.error('Error object:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    
    res.status(500).json({
      success: false,
      message: 'Save operation failed',
      error: error.message,
      errorName: error.name,
      errorCode: error.code
    });
  }
});

// Simple CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  console.log('🧪 CORS test request from:', req.headers.origin || 'no origin');
  res.json({
    success: true,
    message: 'CORS is working!',
    origin: req.headers.origin || 'no origin',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io accessible to other modules
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // Join teacher room when teacher connects
  socket.on('join-teacher-room', (teacherId) => {
    socket.join(`teacher-${teacherId}`);
    console.log(`👨‍🏫 Teacher ${teacherId} joined their room`);
  });

  // Join student room when student connects
  socket.on('join-student-room', (studentId) => {
    socket.join(`student-${studentId}`);
    console.log(`👨‍🎓 Student ${studentId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT} - Updated`);
  console.log(`📚 Qudrat Educational Platform API is ready!`);
  console.log(`🔌 Socket.IO server is ready!`);
});
