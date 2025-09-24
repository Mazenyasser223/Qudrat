const cloudinary = require('./server/config/cloudinary');
const fs = require('fs');
const path = require('path');

async function uploadHomepageAssets() {
  console.log('🚀 Starting homepage assets upload to Cloudinary...');
  
  const assets = [
    // Main images
    { local: '/var/www/qudrat/alaaa.jpg', name: 'alaaa', folder: 'qudrat/homepage' },
    { local: '/var/www/qudrat/logo.png', name: 'logo', folder: 'qudrat/homepage' },
    { local: '/var/www/qudrat/mazen.jpg', name: 'mazen', folder: 'qudrat/homepage' },
    
    // Icons
    { local: '/var/www/qudrat/icons/basics.png', name: 'basics', folder: 'qudrat/icons' },
    { local: '/var/www/qudrat/icons/rules.png', name: 'rules', folder: 'qudrat/icons' },
    { local: '/var/www/qudrat/icons/whatsapp.svg', name: 'whatsapp', folder: 'qudrat/icons' }
  ];
  
  const results = {};
  
  for (const asset of assets) {
    try {
      console.log(`📤 Uploading ${asset.name}...`);
      
      if (!fs.existsSync(asset.local)) {
        console.log(`⚠️  File not found: ${asset.local}`);
        continue;
      }
      
      const result = await cloudinary.uploader.upload(asset.local, {
        folder: asset.folder,
        resource_type: 'auto',
        quality: 'auto',
        fetch_format: 'auto',
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      });
      
      results[asset.name] = result.secure_url;
      console.log(`✅ ${asset.name}: ${result.secure_url}`);
      console.log(`   Size: ${(result.bytes / 1024).toFixed(1)}KB`);
      
    } catch (error) {
      console.error(`❌ Error uploading ${asset.name}:`, error.message);
    }
  }
  
  console.log('\n📋 Upload Results:');
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}

uploadHomepageAssets()
  .then(() => {
    console.log('🎉 Homepage assets upload completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Upload failed:', error);
    process.exit(1);
  });
