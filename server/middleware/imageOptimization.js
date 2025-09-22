const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Image optimization middleware
const optimizeImage = async (imageData, options = {}) => {
  try {
    const {
      width = 800,
      height = 600,
      quality = 'auto',
      format = 'auto',
      crop = 'limit'
    } = options;

    // Upload to Cloudinary with optimization
    const result = await cloudinary.uploader.upload(imageData, {
      width,
      height,
      quality,
      format,
      crop,
      fetch_format: 'auto',
      flags: 'progressive',
      // Additional optimizations
      transformation: [
        { width, height, crop },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    return result.secure_url;
  } catch (error) {
    console.error('Image optimization error:', error);
    throw error;
  }
};

// Generate optimized image URL
const getOptimizedImageUrl = (publicId, options = {}) => {
  const {
    width = 800,
    height = 600,
    quality = 'auto',
    format = 'auto',
    crop = 'limit'
  } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    quality,
    format,
    crop,
    fetch_format: 'auto',
    flags: 'progressive'
  });
};

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Image deletion error:', error);
    throw error;
  }
};

module.exports = {
  optimizeImage,
  getOptimizedImageUrl,
  deleteImage,
  cloudinary
};
