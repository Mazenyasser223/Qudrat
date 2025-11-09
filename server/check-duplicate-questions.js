require('dotenv').config();
const mongoose = require('mongoose');
const Exam = require('./models/Exam');

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

// Main function to check for duplicates
const checkDuplicateQuestions = async () => {
  try {
    console.log('\n🔍 Starting duplicate question check...\n');

    // Fetch all exams (both active and inactive)
    const exams = await Exam.find({}).select('_id title examGroup order isActive questions').lean();
    console.log(`📚 Found ${exams.length} total exams\n`);

    // Track all questions with their metadata
    const questionMap = new Map(); // key: questionImage URL, value: array of occurrences
    const allQuestions = [];

    // Process each exam
    exams.forEach((exam, examIndex) => {
      if (!exam.questions || !Array.isArray(exam.questions)) {
        return;
      }

      exam.questions.forEach((question, questionIndex) => {
        if (!question.questionImage) {
          return;
        }

        const questionKey = question.questionImage.trim();
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

        // Group by questionImage URL
        if (!questionMap.has(questionKey)) {
          questionMap.set(questionKey, []);
        }
        questionMap.get(questionKey).push(questionData);
      });
    });

    console.log(`📝 Total questions analyzed: ${allQuestions.length}\n`);

    // Find duplicates
    const duplicatesByImage = [];
    const exactDuplicates = [];
    const duplicateGroups = new Map();

    questionMap.forEach((occurrences, questionImage) => {
      if (occurrences.length > 1) {
        duplicatesByImage.push({
          questionImage,
          count: occurrences.length,
          occurrences
        });

        // Group by exact match (questionImage + correctAnswer + explanation)
        occurrences.forEach(occurrence => {
          const exactKey = `${questionImage}|${occurrence.correctAnswer}|${occurrence.explanation}`;
          if (!duplicateGroups.has(exactKey)) {
            duplicateGroups.set(exactKey, []);
          }
          duplicateGroups.get(exactKey).push(occurrence);
        });
      }
    });

    // Find exact duplicates
    duplicateGroups.forEach((occurrences, exactKey) => {
      if (occurrences.length > 1) {
        exactDuplicates.push({
          key: exactKey,
          count: occurrences.length,
          occurrences
        });
      }
    });

    // Print results
    console.log('='.repeat(80));
    console.log('📊 DUPLICATE QUESTION ANALYSIS RESULTS');
    console.log('='.repeat(80));
    console.log(`\n📸 Questions with same image URL: ${duplicatesByImage.length}`);
    console.log(`🎯 Exact duplicates (same image + answer + explanation): ${exactDuplicates.length}\n`);

    // Report duplicates by image
    if (duplicatesByImage.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('🖼️  DUPLICATES BY IMAGE URL (Same Question Image)');
      console.log('='.repeat(80));
      
      duplicatesByImage.forEach((dup, index) => {
        console.log(`\n${index + 1}. Question Image: ${dup.questionImage.substring(0, 80)}...`);
        console.log(`   Found ${dup.count} times in:\n`);
        
        dup.occurrences.forEach((occ, occIndex) => {
          console.log(`   ${occIndex + 1}. Exam: "${occ.examTitle}"`);
          console.log(`      - Group: ${occ.examGroup}, Order: ${occ.examOrder}`);
          console.log(`      - Question Index: ${occ.questionIndex}`);
          console.log(`      - Exam ID: ${occ.examId}`);
          console.log(`      - Exam Active: ${occ.isActive ? 'Yes' : 'No'}`);
          console.log(`      - Correct Answer: ${occ.correctAnswer}`);
          console.log(`      - Explanation: ${occ.explanation ? occ.explanation.substring(0, 50) + '...' : '(none)'}`);
          console.log('');
        });
      });
    }

    // Report exact duplicates
    if (exactDuplicates.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('🎯 EXACT DUPLICATES (Same Image + Answer + Explanation)');
      console.log('='.repeat(80));
      
      exactDuplicates.forEach((dup, index) => {
        const [image, answer, explanation] = dup.key.split('|');
        console.log(`\n${index + 1}. Exact Match:`);
        console.log(`   Image: ${image.substring(0, 80)}...`);
        console.log(`   Answer: ${answer}`);
        console.log(`   Explanation: ${explanation ? explanation.substring(0, 50) + '...' : '(none)'}`);
        console.log(`   Found ${dup.count} times in:\n`);
        
        dup.occurrences.forEach((occ, occIndex) => {
          console.log(`   ${occIndex + 1}. Exam: "${occ.examTitle}"`);
          console.log(`      - Group: ${occ.examGroup}, Order: ${occ.examOrder}`);
          console.log(`      - Question Index: ${occ.questionIndex}`);
          console.log(`      - Exam ID: ${occ.examId}`);
          console.log(`      - Exam Active: ${occ.isActive ? 'Yes' : 'No'}`);
          console.log('');
        });
      });
    }

    // Summary statistics
    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY STATISTICS');
    console.log('='.repeat(80));
    
    const totalDuplicateImages = duplicatesByImage.reduce((sum, dup) => sum + dup.count, 0);
    const uniqueDuplicateImages = duplicatesByImage.length;
    const totalExactDuplicates = exactDuplicates.reduce((sum, dup) => sum + dup.count, 0);
    const uniqueExactDuplicates = exactDuplicates.length;

    console.log(`\nTotal Questions: ${allQuestions.length}`);
    console.log(`Unique Question Images: ${questionMap.size}`);
    console.log(`\nDuplicate Images:`);
    console.log(`  - Questions with duplicate images: ${totalDuplicateImages}`);
    console.log(`  - Unique images that are duplicated: ${uniqueDuplicateImages}`);
    console.log(`\nExact Duplicates:`);
    console.log(`  - Questions that are exact duplicates: ${totalExactDuplicates}`);
    console.log(`  - Unique exact duplicate groups: ${uniqueExactDuplicates}`);
    
    // Group by exam group
    const groupStats = new Map();
    duplicatesByImage.forEach(dup => {
      dup.occurrences.forEach(occ => {
        if (!groupStats.has(occ.examGroup)) {
          groupStats.set(occ.examGroup, 0);
        }
        groupStats.set(occ.examGroup, groupStats.get(occ.examGroup) + 1);
      });
    });

    if (groupStats.size > 0) {
      console.log(`\n📊 Duplicates by Exam Group:`);
      const sortedGroups = Array.from(groupStats.entries()).sort((a, b) => a[0] - b[0]);
      sortedGroups.forEach(([group, count]) => {
        console.log(`  - Group ${group}: ${count} duplicate questions`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis Complete!');
    console.log('='.repeat(80) + '\n');

    // Export results to JSON file
    const fs = require('fs');
    const results = {
      timestamp: new Date().toISOString(),
      totalQuestions: allQuestions.length,
      uniqueImages: questionMap.size,
      duplicatesByImage: duplicatesByImage.map(dup => ({
        questionImage: dup.questionImage,
        count: dup.count,
        occurrences: dup.occurrences.map(occ => ({
          examId: occ.examId,
          examTitle: occ.examTitle,
          examGroup: occ.examGroup,
          examOrder: occ.examOrder,
          questionIndex: occ.questionIndex,
          correctAnswer: occ.correctAnswer,
          explanation: occ.explanation,
          isActive: occ.isActive
        }))
      })),
      exactDuplicates: exactDuplicates.map(dup => {
        const [image, answer, explanation] = dup.key.split('|');
        return {
          questionImage: image,
          correctAnswer: answer,
          explanation: explanation,
          count: dup.count,
          occurrences: dup.occurrences.map(occ => ({
            examId: occ.examId,
            examTitle: occ.examTitle,
            examGroup: occ.examGroup,
            examOrder: occ.examOrder,
            questionIndex: occ.questionIndex,
            isActive: occ.isActive
          }))
        };
      }),
      summary: {
        totalDuplicateImages,
        uniqueDuplicateImages,
        totalExactDuplicates,
        uniqueExactDuplicates
      }
    };

    const outputFile = 'duplicate-questions-report.json';
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

