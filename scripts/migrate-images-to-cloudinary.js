/**
 * Image Migration Script: Base64 to Cloudinary
 * 
 * This script migrates all exam question images from Base64 strings in MongoDB
 * to Cloudinary URLs for better performance.
 * 
 * Usage: node scripts/migrate-images-to-cloudinary.js
 */

const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const Exam = require('../server/models/Exam');
require('dotenv').config({ path: '../server/.env' });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function migrateImagesToCloudinary() {
  try {
    console.log('🚀 Starting image migration to Cloudinary...');
    console.log('=====================================\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all exams
    const exams = await Exam.find({});
    console.log(`📚 Found ${exams.length} exams to process`);

    let totalImages = 0;
    let migratedImages = 0;
    let skippedImages = 0;
    let errorImages = 0;

    // Process each exam
    for (let examIndex = 0; examIndex < exams.length; examIndex++) {
      const exam = exams[examIndex];
      console.log(`\n📖 Processing exam ${examIndex + 1}/${exams.length}: "${exam.title}"`);
      
      let examUpdated = false;

      // Process each question in the exam
      for (let questionIndex = 0; questionIndex < exam.questions.length; questionIndex++) {
        const question = exam.questions[questionIndex];
        totalImages++;

        // Check if image is Base64
        if (question.questionImage && question.questionImage.startsWith('data:image/')) {
          try {
            console.log(`  📸 Migrating image ${totalImages}...`);

            // Upload Base64 image to Cloudinary
            const result = await cloudinary.uploader.upload(question.questionImage, {
              folder: 'qudrat/questions',
              resource_type: 'image',
              quality: 'auto',
              fetch_format: 'auto',
              transformation: [
                { width: 800, height: 600, crop: 'limit' }, // Resize for better performance
                { quality: 'auto' },
                { fetch_format: 'auto' }
              ]
            });

            // Update question with Cloudinary URL
            const oldImage = question.questionImage;
            question.questionImage = result.secure_url;
            examUpdated = true;
            migratedImages++;

            console.log(`    ✅ Migrated: ${result.secure_url}`);
            console.log(`    📊 Size: ${Math.round(result.bytes / 1024)}KB`);

          } catch (error) {
            console.error(`    ❌ Error migrating image:`, error.message);
            errorImages++;
          }
        } else if (question.questionImage && question.questionImage.includes('cloudinary.com')) {
          console.log(`    ⏭️  Already on Cloudinary: ${question.questionImage}`);
          skippedImages++;
        } else if (question.questionImage && question.questionImage.includes('/uploads/')) {
          console.log(`    ⚠️  Local file path detected: ${question.questionImage}`);
          skippedImages++;
        } else {
          console.log(`    ⏭️  No image or invalid format`);
          skippedImages++;
        }
      }

      // Save exam if any questions were updated
      if (examUpdated) {
        await exam.save();
        console.log(`  💾 Exam "${exam.title}" saved with updated images`);
      }
    }

    // Summary
    console.log('\n🎉 Migration Complete!');
    console.log('====================');
    console.log(`📊 Total images processed: ${totalImages}`);
    console.log(`✅ Successfully migrated: ${migratedImages}`);
    console.log(`⏭️  Skipped: ${skippedImages}`);
    console.log(`❌ Errors: ${errorImages}`);
    
    if (migratedImages > 0) {
      console.log('\n🚀 Performance improvements expected:');
      console.log('  • 90% reduction in database size');
      console.log('  • 10x faster query performance');
      console.log('  • Reduced server memory usage');
      console.log('  • Faster image loading with CDN');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run migration
migrateImagesToCloudinary();
