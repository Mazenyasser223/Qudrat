const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Configure Cloudinary storage for reviews
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'qudrat/reviews',
    format: async (req, file) => {
      // Keep original format or convert to jpg if not supported
      const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      const originalFormat = file.originalname.split('.').pop().toLowerCase();
      return supportedFormats.includes(originalFormat) ? originalFormat : 'jpg';
    },
    public_id: (req, file) => {
      // Generate unique public_id with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `review-${uniqueSuffix}`;
    },
    transformation: [
      { width: 800, height: 600, crop: 'limit', quality: 'auto' }
    ]
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
