const mongoose = require('mongoose');
const User = require('./models/User');
const Exam = require('./models/Exam');
require('dotenv').config();

async function fixTotalQuestions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all students with exam progress
    const students = await User.find({ 
      role: 'student',
      examProgress: { $exists: true, $ne: [] }
    });

    console.log(`\n📊 Found ${students.length} students with exam progress`);
    
    let totalFixed = 0;
    let studentsFixed = 0;

    for (const student of students) {
      let studentHasChanges = false;
      
      for (const progress of student.examProgress) {
        // Only fix if totalQuestions is 0 or missing
        if (!progress.totalQuestions || progress.totalQuestions === 0) {
          // Get the exam to find the correct totalQuestions
          const exam = await Exam.findById(progress.examId).select('questions title');
          
          if (exam && exam.questions && exam.questions.length > 0) {
            progress.totalQuestions = exam.questions.length;
            
            // Also fix correctAnswers and wrongAnswers if missing
            if (!progress.correctAnswers && progress.score) {
              progress.correctAnswers = progress.score;
            }
            if (!progress.wrongAnswers && progress.score !== undefined && progress.totalQuestions) {
              progress.wrongAnswers = progress.totalQuestions - progress.score;
            }
            
            totalFixed++;
            studentHasChanges = true;
            
            console.log(`  ✓ Fixed: ${student.name} - ${exam.title} (${progress.totalQuestions} questions)`);
          } else if (!exam) {
            console.log(`  ⚠ Skipped: Exam ${progress.examId} not found (deleted exam)`);
          }
        }
      }
      
      if (studentHasChanges) {
        await student.save();
        studentsFixed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Fixed ${totalFixed} exam progress entries`);
    console.log(`✅ Updated ${studentsFixed} student records`);
    console.log(`✅ Skipped ${students.length - studentsFixed} students (no changes needed)`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixTotalQuestions();
