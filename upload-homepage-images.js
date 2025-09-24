const cloudinary = require('./server/config/cloudinary');
const fs = require('fs');
const path = require('path');

async function uploadHomepageImages() {
  console.log('🚀 Starting homepage images upload to Cloudinary...');
  
  const images = [
    { local: '/var/www/qudrat/alaaa.jpg', name: 'alaaa', alt: 'Professional training image' },
    { local: '/var/www/qudrat/logo.png', name: 'logo', alt: 'Qudrat logo' },
    { local: '/var/www/qudrat/mazen.jpg', name: 'mazen', alt: 'Mazen profile image' }
  ];
  
  const results = {};
  
  for (const img of images) {
    try {
      console.log(`📤 Uploading ${img.name}...`);
      
      if (!fs.existsSync(img.local)) {
        console.log(`⚠️  File not found: ${img.local}`);
        continue;
      }
      
      const result = await cloudinary.uploader.upload(img.local, {
        folder: 'qudrat/homepage',
        resource_type: 'auto',
        quality: 'auto',
        fetch_format: 'auto',
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      });
      
      results[img.name] = result.secure_url;
      console.log(`✅ ${img.name}: ${result.secure_url}`);
      console.log(`   Size: ${(result.bytes / 1024).toFixed(1)}KB`);
      
    } catch (error) {
      console.error(`❌ Error uploading ${img.name}:`, error.message);
    }
  }
  
  console.log('\n📋 Upload Results:');
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}

uploadHomepageImages()
  .then(() => {
    console.log('🎉 Homepage images upload completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Upload failed:', error);
    process.exit(1);
  });
