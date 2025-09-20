const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure reviews directory exists
const reviewsDir = path.join(__dirname, '../uploads/reviews');
console.log('📁 Reviews directory path:', reviewsDir);
console.log('📁 Current working directory:', process.cwd());
console.log('📁 __dirname:', __dirname);

if (!fs.existsSync(reviewsDir)) {
  console.log('📁 Creating reviews directory:', reviewsDir);
  try {
    fs.mkdirSync(reviewsDir, { recursive: true });
    console.log('✅ Reviews directory created successfully');
  } catch (error) {
    console.error('❌ Error creating reviews directory:', error);
  }
} else {
  console.log('✅ Reviews directory already exists');
}

// Configure storage for reviews
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, reviewsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'review-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer for reviews
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for review images
  }
});

module.exports = upload;
