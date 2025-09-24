/**
 * Database Performance Analysis Script
 * 
 * This script analyzes the current database performance issues
 * caused by Base64 image storage in exam questions.
 * 
 * Usage: node analyze-performance.js
 */

const mongoose = require('mongoose');
const Exam = require('./models/Exam');
require('dotenv').config();

async function analyzeDatabasePerformance() {
  try {
    console.log('🔍 Analyzing Database Performance Issues...');
    console.log('==========================================\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all exams
    const exams = await Exam.find({});
    console.log(`📚 Found ${exams.length} exams`);

    let totalQuestions = 0;
    let totalBase64Images = 0;
    let totalCloudinaryImages = 0;
    let totalLocalImages = 0;
    let totalNoImages = 0;
    let totalBase64Size = 0;

    // Analyze each exam
    for (const exam of exams) {
      console.log(`\n📖 Exam: "${exam.title}" (Group ${exam.examGroup}, Order ${exam.order})`);
      console.log(`   Questions: ${exam.questions.length}`);
      
      totalQuestions += exam.questions.length;

      for (let i = 0; i < exam.questions.length; i++) {
        const question = exam.questions[i];
        const imageData = question.questionImage;

        if (imageData) {
          if (imageData.startsWith('data:image/')) {
            // Base64 image
            totalBase64Images++;
            const base64Size = Math.round(imageData.length * 0.75 / 1024); // Approximate size in KB
            totalBase64Size += base64Size;
            console.log(`   📸 Question ${i + 1}: Base64 (${base64Size}KB)`);
          } else if (imageData.includes('cloudinary.com')) {
            // Cloudinary image
            totalCloudinaryImages++;
            console.log(`   ☁️  Question ${i + 1}: Cloudinary URL`);
          } else if (imageData.includes('/uploads/')) {
            // Local file
            totalLocalImages++;
            console.log(`   📁 Question ${i + 1}: Local file`);
          } else {
            // Other format
            totalNoImages++;
            console.log(`   ❓ Question ${i + 1}: Unknown format`);
          }
        } else {
          totalNoImages++;
          console.log(`   ❌ Question ${i + 1}: No image`);
        }
      }
    }

    // Calculate performance impact
    const totalImages = totalBase64Images + totalCloudinaryImages + totalLocalImages + totalNoImages;
    const base64SizeMB = Math.round(totalBase64Size / 1024 * 100) / 100;
    const estimatedDBSizeMB = Math.round(base64SizeMB * 1.5); // Base64 + MongoDB overhead

    // Performance analysis
    console.log('\n📊 Performance Analysis Results');
    console.log('===============================');
    console.log(`📚 Total exams: ${exams.length}`);
    console.log(`❓ Total questions: ${totalQuestions}`);
    console.log(`📸 Total images: ${totalImages}`);
    console.log('');
    console.log('🖼️  Image Storage Breakdown:');
    console.log(`   📦 Base64 images: ${totalBase64Images} (${base64SizeMB}MB)`);
    console.log(`   ☁️  Cloudinary images: ${totalCloudinaryImages}`);
    console.log(`   📁 Local files: ${totalLocalImages}`);
    console.log(`   ❌ No images: ${totalNoImages}`);
    console.log('');
    console.log('⚡ Performance Impact:');
    console.log(`   🗄️  Estimated database size: ${estimatedDBSizeMB}MB`);
    console.log(`   🐌 Query performance: ${totalBase64Images > 0 ? 'SLOW (due to large Base64 strings)' : 'GOOD'}`);
    console.log(`   💾 Memory usage: ${totalBase64Images > 0 ? 'HIGH (Base64 strings in memory)' : 'LOW'}`);
    console.log(`   🌐 Network transfer: ${totalBase64Images > 0 ? 'SLOW (large payloads)' : 'FAST'}`);

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (totalBase64Images > 0) {
      console.log('   🚨 URGENT: Migrate Base64 images to Cloudinary');
      console.log('   📈 Expected improvements:');
      console.log('      • 90% reduction in database size');
      console.log('      • 10x faster query performance');
      console.log('      • Reduced server memory usage');
      console.log('      • Faster image loading with CDN');
      console.log('');
      console.log('   🛠️  Next steps:');
      console.log('      1. Run: node migrate-to-cloudinary.js');
      console.log('      2. Test the migration');
      console.log('      3. Deploy to production');
    } else {
      console.log('   ✅ No Base64 images found - database is optimized!');
    }

    // Cost analysis
    if (totalBase64Images > 0) {
      console.log('\n💰 Cost Analysis:');
      console.log(`   Current: High server costs due to ${estimatedDBSizeMB}MB database`);
      console.log(`   After migration: ~$5-10/month for Cloudinary storage`);
      console.log(`   Savings: Reduced server resources and faster performance`);
    }

  } catch (error) {
    console.error('💥 Analysis failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run analysis
analyzeDatabasePerformance();
