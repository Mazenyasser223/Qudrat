require('dotenv').config();
const mongoose = require('mongoose');
const Exam = require('./models/Exam');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const imghash = require('imghash');
const sharp = require('sharp');

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qudrat-platform', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

// Extract base64 data from data URL
const extractBase64FromDataURL = (dataURL) => {
  if (!dataURL || !dataURL.startsWith('data:')) {
    return null;
  }
  const base64Match = dataURL.match(/base64,(.+)$/);
  return base64Match ? Buffer.from(base64Match[1], 'base64') : null;
};

// Download image from URL
const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = 10000; // 10 seconds timeout
    
    const req = protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download: ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    
    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('Download timeout'));
    });
  });
};

// Get image buffer from URL or base64
const getImageBuffer = async (imageUrl) => {
  try {
    // Handle base64 data URLs
    if (imageUrl.startsWith('data:')) {
      const buffer = extractBase64FromDataURL(imageUrl);
      if (buffer) {
        return buffer;
      }
    }
    
    // Handle HTTP/HTTPS URLs
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return await downloadImage(imageUrl);
    }
    
    return null;
  } catch (error) {
    console.warn(`⚠️  Failed to process image: ${imageUrl.substring(0, 50)}... - ${error.message}`);
    return null;
  }
};

// Calculate perceptual hash for an image
const calculateImageHash = async (imageBuffer) => {
  try {
    if (!imageBuffer) {
      return null;
    }
    
    // Use imghash to calculate perceptual hash (dHash algorithm)
    // This will detect similar images even if they're slightly different
    const hash = await imghash.hash(imageBuffer, 16); // 16-bit hash
    return hash;
  } catch (error) {
    console.warn(`⚠️  Failed to hash image: ${error.message}`);
    return null;
  }
};

// Calculate MD5 hash for exact match detection
const calculateMD5Hash = (imageBuffer) => {
  if (!imageBuffer) {
    return null;
  }
  return crypto.createHash('md5').update(imageBuffer).digest('hex');
};

// Main function to check for duplicates
const checkDuplicateQuestions = async () => {
  try {
    console.log('\n🔍 Starting advanced duplicate question check with image hashing...\n');

    // Fetch all exams (both active and inactive)
    const exams = await Exam.find({}).select('_id title examGroup order isActive questions').lean();
    console.log(`📚 Found ${exams.length} total exams\n`);

    // Track all questions with their metadata
    const questionMap = new Map(); // key: questionImage URL (for tracking)
    const hashMap = new Map(); // key: perceptual hash, value: array of occurrences
    const md5Map = new Map(); // key: MD5 hash, value: array of occurrences
    const allQuestions = [];
    let processedCount = 0;
    let failedCount = 0;

    console.log('📥 Processing images and calculating hashes...\n');

    // Process each exam
    for (const exam of exams) {
      if (!exam.questions || !Array.isArray(exam.questions)) {
        continue;
      }

      for (let questionIndex = 0; questionIndex < exam.questions.length; questionIndex++) {
        const question = exam.questions[questionIndex];
        if (!question.questionImage) {
          continue;
        }

        processedCount++;
        if (processedCount % 100 === 0) {
          console.log(`   Processed ${processedCount} questions...`);
        }

        const questionData = {
          examId: exam._id.toString(),
          examTitle: exam.title,
          examGroup: exam.examGroup,
          examOrder: exam.order,
          isActive: exam.isActive,
          questionIndex: questionIndex,
          questionImage: question.questionImage,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation || '',
          questionId: question._id ? question._id.toString() : null
        };

        allQuestions.push(questionData);

        // Get image buffer
        const imageBuffer = await getImageBuffer(question.questionImage);
        
        if (!imageBuffer) {
          failedCount++;
          // Still track by URL if we can't process the image
          const questionKey = question.questionImage.trim();
          if (!questionMap.has(questionKey)) {
            questionMap.set(questionKey, []);
          }
          questionMap.get(questionKey).push(questionData);
          continue;
        }

        // Calculate hashes
        const perceptualHash = await calculateImageHash(imageBuffer);
        const md5Hash = calculateMD5Hash(imageBuffer);

        // Store original URL mapping
        const questionKey = question.questionImage.trim();
        if (!questionMap.has(questionKey)) {
          questionMap.set(questionKey, []);
        }
        questionMap.get(questionKey).push(questionData);

        // Store by perceptual hash (for similar images)
        if (perceptualHash) {
          if (!hashMap.has(perceptualHash)) {
            hashMap.set(perceptualHash, []);
          }
          hashMap.get(perceptualHash).push({
            ...questionData,
            hash: perceptualHash,
            md5Hash: md5Hash
          });
        }

        // Store by MD5 hash (for exact matches)
        if (md5Hash) {
          if (!md5Map.has(md5Hash)) {
            md5Map.set(md5Hash, []);
          }
          md5Map.get(md5Hash).push({
            ...questionData,
            hash: perceptualHash,
            md5Hash: md5Hash
          });
        }
      }
    }

    console.log(`\n✅ Processing complete!`);
    console.log(`   Processed: ${processedCount} questions`);
    console.log(`   Failed to process: ${failedCount} questions\n`);

    // Find duplicates by URL (original method)
    const duplicatesByImage = [];
    questionMap.forEach((occurrences, questionImage) => {
      if (occurrences.length > 1) {
        duplicatesByImage.push({
          questionImage,
          count: occurrences.length,
          occurrences
        });
      }
    });

    // Find duplicates by MD5 hash (exact image matches)
    const exactDuplicatesByMD5 = [];
    md5Map.forEach((occurrences, md5Hash) => {
      if (occurrences.length > 1) {
        exactDuplicatesByMD5.push({
          md5Hash,
          count: occurrences.length,
          occurrences
        });
      }
    });

    // Find duplicates by perceptual hash (similar images)
    const similarDuplicatesByHash = [];
    hashMap.forEach((occurrences, hash) => {
      if (occurrences.length > 1) {
        similarDuplicatesByHash.push({
          hash,
          count: occurrences.length,
          occurrences
        });
      }
    });

    // Print results
    console.log('='.repeat(80));
    console.log('📊 ADVANCED DUPLICATE QUESTION ANALYSIS RESULTS');
    console.log('='.repeat(80));
    console.log(`\n📸 Questions with same image URL: ${duplicatesByImage.length}`);
    console.log(`🔒 Exact duplicates (same image content - MD5): ${exactDuplicatesByMD5.length}`);
    console.log(`🔍 Similar duplicates (perceptual hash match): ${similarDuplicatesByHash.length}\n`);

    // Report exact duplicates by MD5 (most reliable)
    if (exactDuplicatesByMD5.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('🔒 EXACT DUPLICATES (Same Image Content - MD5 Hash)');
      console.log('='.repeat(80));
      console.log('⚠️  These are 100% identical images (same binary content)\n');
      
      exactDuplicatesByMD5.forEach((dup, index) => {
        console.log(`\n${index + 1}. MD5 Hash: ${dup.md5Hash}`);
        console.log(`   Found ${dup.count} times in:\n`);
        
        dup.occurrences.forEach((occ, occIndex) => {
          console.log(`   ${occIndex + 1}. Exam: "${occ.examTitle}"`);
          console.log(`      - Group: ${occ.examGroup}, Order: ${occ.examOrder}`);
          console.log(`      - Question Index: ${occ.questionIndex}`);
          console.log(`      - Exam ID: ${occ.examId}`);
          console.log(`      - Exam Active: ${occ.isActive ? 'Yes' : 'No'}`);
          console.log(`      - Correct Answer: ${occ.correctAnswer}`);
          console.log(`      - Image URL: ${occ.questionImage.substring(0, 80)}...`);
          console.log('');
        });
      });
    }

    // Report similar duplicates by perceptual hash
    if (similarDuplicatesByHash.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('🔍 SIMILAR DUPLICATES (Perceptual Hash Match)');
      console.log('='.repeat(80));
      console.log('⚠️  These images are visually similar (may have slight differences)\n');
      
      // Filter out exact matches (already reported)
      const similarOnly = similarDuplicatesByHash.filter(dup => {
        const md5Hashes = [...new Set(dup.occurrences.map(o => o.md5Hash))];
        return md5Hashes.length > 1; // Only show if MD5 hashes differ
      });

      if (similarOnly.length > 0) {
        similarOnly.forEach((dup, index) => {
          console.log(`\n${index + 1}. Perceptual Hash: ${dup.hash}`);
          console.log(`   Found ${dup.count} times in:\n`);
          
          dup.occurrences.forEach((occ, occIndex) => {
            console.log(`   ${occIndex + 1}. Exam: "${occ.examTitle}"`);
            console.log(`      - Group: ${occ.examGroup}, Order: ${occ.examOrder}`);
            console.log(`      - Question Index: ${occ.questionIndex}`);
            console.log(`      - Exam ID: ${occ.examId}`);
            console.log(`      - Exam Active: ${occ.isActive ? 'Yes' : 'No'}`);
            console.log(`      - MD5 Hash: ${occ.md5Hash}`);
            console.log('');
          });
        });
      } else {
        console.log('   (All similar matches are already exact duplicates)\n');
      }
    }

    // Report duplicates by URL (for reference)
    if (duplicatesByImage.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('📸 DUPLICATES BY URL (Same Image URL)');
      console.log('='.repeat(80));
      console.log('⚠️  These have the same URL but may have different content\n');
      
      // Only show if not already reported in MD5 duplicates
      const urlOnlyDuplicates = duplicatesByImage.filter(dup => {
        // Check if all occurrences have the same MD5
        const allMD5s = dup.occurrences.map(occ => {
          const found = allQuestions.find(q => 
            q.examId === occ.examId && 
            q.questionIndex === occ.questionIndex
          );
          return found ? calculateMD5Hash(extractBase64FromDataURL(found.questionImage) || null) : null;
        }).filter(Boolean);
        
        const uniqueMD5s = [...new Set(allMD5s)];
        return uniqueMD5s.length > 1; // Only show if MD5 hashes differ
      });

      if (urlOnlyDuplicates.length > 0) {
        urlOnlyDuplicates.forEach((dup, index) => {
          console.log(`\n${index + 1}. Image URL: ${dup.questionImage.substring(0, 80)}...`);
          console.log(`   Found ${dup.count} times in:\n`);
          
          dup.occurrences.forEach((occ, occIndex) => {
            console.log(`   ${occIndex + 1}. Exam: "${occ.examTitle}"`);
            console.log(`      - Group: ${occ.examGroup}, Order: ${occ.examOrder}`);
            console.log(`      - Question Index: ${occ.questionIndex}`);
            console.log(`      - Exam ID: ${occ.examId}`);
            console.log('');
          });
        });
      } else {
        console.log('   (All URL duplicates are already exact duplicates)\n');
      }
    }

    // Summary statistics
    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY STATISTICS');
    console.log('='.repeat(80));
    
    const totalDuplicateImages = duplicatesByImage.reduce((sum, dup) => sum + dup.count, 0);
    const uniqueDuplicateImages = duplicatesByImage.length;
    const totalExactDuplicates = exactDuplicatesByMD5.reduce((sum, dup) => sum + dup.count, 0);
    const uniqueExactDuplicates = exactDuplicatesByMD5.length;
    const totalSimilarDuplicates = similarDuplicatesByHash.reduce((sum, dup) => sum + dup.count, 0);
    const uniqueSimilarDuplicates = similarDuplicatesByHash.length;

    console.log(`\nTotal Questions: ${allQuestions.length}`);
    console.log(`Questions Processed: ${processedCount}`);
    console.log(`Questions Failed: ${failedCount}`);
    console.log(`Unique Question Images (by URL): ${questionMap.size}`);
    console.log(`Unique Image Hashes (MD5): ${md5Map.size}`);
    console.log(`\n🔒 Exact Duplicates (MD5):`);
    console.log(`  - Questions that are exact duplicates: ${totalExactDuplicates}`);
    console.log(`  - Unique exact duplicate groups: ${uniqueExactDuplicates}`);
    console.log(`\n🔍 Similar Duplicates (Perceptual Hash):`);
    console.log(`  - Questions that are visually similar: ${totalSimilarDuplicates}`);
    console.log(`  - Unique similar duplicate groups: ${uniqueSimilarDuplicates}`);
    console.log(`\n📸 Duplicates by URL:`);
    console.log(`  - Questions with duplicate URLs: ${totalDuplicateImages}`);
    console.log(`  - Unique URLs that are duplicated: ${uniqueDuplicateImages}`);
    
    // Group by exam group
    const groupStats = new Map();
    exactDuplicatesByMD5.forEach(dup => {
      dup.occurrences.forEach(occ => {
        if (!groupStats.has(occ.examGroup)) {
          groupStats.set(occ.examGroup, 0);
        }
        groupStats.set(occ.examGroup, groupStats.get(occ.examGroup) + 1);
      });
    });

    if (groupStats.size > 0) {
      console.log(`\n📊 Exact Duplicates by Exam Group:`);
      const sortedGroups = Array.from(groupStats.entries()).sort((a, b) => a[0] - b[0]);
      sortedGroups.forEach(([group, count]) => {
        console.log(`  - Group ${group}: ${count} duplicate questions`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Advanced Analysis Complete!');
    console.log('='.repeat(80) + '\n');

    // Export results to JSON file
    const fs = require('fs');
    const results = {
      timestamp: new Date().toISOString(),
      totalQuestions: allQuestions.length,
      processedCount,
      failedCount,
      uniqueImagesByURL: questionMap.size,
      uniqueImagesByMD5: md5Map.size,
      exactDuplicates: exactDuplicatesByMD5.map(dup => ({
        md5Hash: dup.md5Hash,
        count: dup.count,
        occurrences: dup.occurrences.map(occ => ({
          examId: occ.examId,
          examTitle: occ.examTitle,
          examGroup: occ.examGroup,
          examOrder: occ.examOrder,
          questionIndex: occ.questionIndex,
          correctAnswer: occ.correctAnswer,
          explanation: occ.explanation,
          questionImage: occ.questionImage,
          isActive: occ.isActive
        }))
      })),
      similarDuplicates: similarDuplicatesByHash.filter(dup => {
        const md5Hashes = [...new Set(dup.occurrences.map(o => o.md5Hash))];
        return md5Hashes.length > 1;
      }).map(dup => ({
        perceptualHash: dup.hash,
        count: dup.count,
        occurrences: dup.occurrences.map(occ => ({
          examId: occ.examId,
          examTitle: occ.examTitle,
          examGroup: occ.examGroup,
          examOrder: occ.examOrder,
          questionIndex: occ.questionIndex,
          md5Hash: occ.md5Hash,
          isActive: occ.isActive
        }))
      })),
      summary: {
        totalExactDuplicates,
        uniqueExactDuplicates,
        totalSimilarDuplicates,
        uniqueSimilarDuplicates: similarDuplicatesByHash.filter(dup => {
          const md5Hashes = [...new Set(dup.occurrences.map(o => o.md5Hash))];
          return md5Hashes.length > 1;
        }).length
      }
    };

    const outputFile = 'duplicate-questions-advanced-report.json';
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`💾 Detailed report saved to: ${outputFile}\n`);

  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
    throw error;
  }
};

// Run the script
const run = async () => {
  try {
    await connectDB();
    await checkDuplicateQuestions();
    await mongoose.connection.close();
    console.log('👋 Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

run();

