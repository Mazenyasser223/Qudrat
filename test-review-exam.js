// Test script to verify review exam functionality
const mongoose = require('mongoose');
const User = require('./server/models/User');
const Exam = require('./server/models/Exam');
const ReviewExam = require('./server/models/ReviewExam');

// Connect to database
mongoose.connect('mongodb://localhost:27017/qudrat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testReviewExam() {
  try {
    console.log('🔍 Testing Review Exam Functionality...\n');

    // Check if we have any students
    const students = await User.find({ role: 'student' });
    console.log(`📚 Found ${students.length} students`);

    // Check if we have any exams
    const exams = await Exam.find({});
    console.log(`📝 Found ${exams.length} exams`);

    // Check if we have any review exams
    const reviewExams = await ReviewExam.find({});
    console.log(`🔄 Found ${reviewExams.length} review exams`);

    // Check student progress
    if (students.length > 0) {
      const student = students[0];
      console.log(`\n👤 Student: ${student.name}`);
      console.log(`📊 Exam Progress: ${student.examProgress.length} exams`);
      
      student.examProgress.forEach((progress, index) => {
        console.log(`  ${index + 1}. Exam ${progress.examId} - Status: ${progress.status}`);
        if (progress.wrongQuestions && progress.wrongQuestions.length > 0) {
          console.log(`     ❌ Wrong Questions: ${progress.wrongQuestions.length}`);
        }
        if (progress.reviewExamId) {
          console.log(`     🔄 Review Exam ID: ${progress.reviewExamId}`);
        }
      });
    }

    // Check review exams details
    if (reviewExams.length > 0) {
      console.log('\n🔄 Review Exams Details:');
      reviewExams.forEach((reviewExam, index) => {
        console.log(`  ${index + 1}. ${reviewExam.title}`);
        console.log(`     Student: ${reviewExam.studentId}`);
        console.log(`     Original Exam: ${reviewExam.originalExamId}`);
        console.log(`     Questions: ${reviewExam.questions.length}`);
        console.log(`     Attempts: ${reviewExam.totalAttempts}`);
        console.log(`     Best Score: ${reviewExam.bestPercentage}%`);
      });
    }

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

testReviewExam();
