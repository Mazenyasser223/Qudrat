const mongoose = require('mongoose');
const User = require('./models/User');
const Exam = require('./models/Exam');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qudrat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function migrateExistingExams() {
  try {
    console.log('🔄 Starting migration of existing exam data...');
    
    // Get all students with exam progress
    const students = await User.find({ 
      role: 'student',
      'examProgress.0': { $exists: true }
    });
    
    console.log(`📊 Found ${students.length} students with exam progress`);
    
    let totalUpdated = 0;
    let studentsUpdated = 0;
    
    for (const student of students) {
      let studentUpdated = false;
      
      for (const progress of student.examProgress) {
        if (progress.status === 'completed' && progress.answers && progress.answers.length > 0) {
          // Check if any answer is missing isCorrect field
          const needsUpdate = progress.answers.some(answer => answer.isCorrect === undefined);
          
          if (needsUpdate) {
            // Get the exam to access questions
            const exam = await Exam.findById(progress.examId);
            if (exam && exam.questions) {
              // Update each answer with isCorrect field
              progress.answers.forEach(answer => {
                if (answer.isCorrect === undefined) {
                  const question = exam.questions.find(q => q._id.toString() === answer.questionId.toString());
                  if (question) {
                    answer.isCorrect = answer.selectedAnswer === question.correctAnswer;
                  }
                }
              });
              
              studentUpdated = true;
              totalUpdated++;
            }
          }
        }
      }
      
      if (studentUpdated) {
        await student.save();
        studentsUpdated++;
        console.log(`✅ Updated student: ${student.name} (${student.email})`);
      }
    }
    
    console.log('🎉 Migration completed!');
    console.log(`📈 Statistics:`);
    console.log(`   - Students processed: ${students.length}`);
    console.log(`   - Students updated: ${studentsUpdated}`);
    console.log(`   - Exam progress records updated: ${totalUpdated}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run migration
migrateExistingExams();
