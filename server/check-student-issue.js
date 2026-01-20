const mongoose = require('mongoose');
const User = require('./models/User');
const Exam = require('./models/Exam');
require('dotenv').config();

async function checkStudent() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const phoneNumber = '0546396650';
    const email = 'marimbkr282008@gmail.com';

    console.log(`\n🔍 Searching for student: ${email} / ${phoneNumber}`);
    console.log('=' .repeat(60));

    // Find student by phone or email
    const student = await User.findOne({ 
      $or: [
        { phoneNumber },
        { email }
      ]
    });

    if (!student) {
      console.log('❌ Student NOT FOUND in database!');
      console.log('\n📋 Possible reasons:');
      console.log('1. Phone number is incorrect');
      console.log('2. Student has not registered yet');
      console.log('3. Phone number format is different in database');
      
      // Try to find by partial matches
      console.log('\n🔍 Searching for similar email/phone...');
      const similarStudents = await User.find({
        $or: [
          { email: { $regex: email.split('@')[0], $options: 'i' } },
          { phoneNumber: { $regex: phoneNumber.substring(0, 7) } }
        ],
        role: 'student'
      }).select('name phoneNumber email isActive');
      
      if (similarStudents.length > 0) {
        console.log(`\nFound ${similarStudents.length} student(s) with similar email/phone:`);
        similarStudents.forEach((s, i) => {
          console.log(`\n${i + 1}. Name: ${s.name}`);
          console.log(`   Phone: ${s.phoneNumber}`);
          console.log(`   Email: ${s.email || 'N/A'}`);
          console.log(`   Active: ${s.isActive}`);
        });
      } else {
        console.log('No students found with similar email/phone.');
      }
      
      await mongoose.connection.close();
      return;
    }

    // Student found - display info
    console.log('\n✅ STUDENT FOUND!');
    console.log('-'.repeat(60));
    console.log(`Name: ${student.name}`);
    console.log(`Phone: ${student.phoneNumber}`);
    console.log(`Email: ${student.email || 'N/A'}`);
    console.log(`Student ID: ${student.studentId || 'N/A'}`);
    console.log(`Role: ${student.role}`);
    console.log(`Active: ${student.isActive}`);
    console.log(`Last Login: ${student.lastLogin || 'Never'}`);
    console.log(`MongoDB ID: ${student._id}`);

    // Check exam progress
    console.log('\n📊 EXAM PROGRESS:');
    console.log('-'.repeat(60));
    
    if (!student.examProgress || student.examProgress.length === 0) {
      console.log('❌ NO EXAM PROGRESS DATA!');
      console.log('\n📋 This means the student has no exams assigned/unlocked.');
      console.log('\nPossible solutions:');
      console.log('1. Teacher needs to unlock exams for this student');
      console.log('2. Check if student is in the correct group');
      console.log('3. Create exam groups if they don\'t exist');
    } else {
      console.log(`Total exam progress entries: ${student.examProgress.length}`);
      
      // Group by status
      const statusCounts = {};
      student.examProgress.forEach(p => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      });
      
      console.log('\nExam Status Breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      
      // Show recent exams
      console.log('\n📝 Recent Exam Progress (last 10):');
      const recentProgress = student.examProgress
        .sort((a, b) => (b.completedAt || b.startTime || 0) - (a.completedAt || a.startTime || 0))
        .slice(0, 10);
      
      for (const progress of recentProgress) {
        const exam = await Exam.findById(progress.examId).select('title examGroup order');
        console.log(`\n  Group ${progress.examGroup} - Exam: ${exam ? exam.title : 'DELETED EXAM'}`);
        console.log(`    Status: ${progress.status}`);
        console.log(`    Score: ${progress.score}/${progress.totalQuestions} (${progress.percentage.toFixed(2)}%)`);
        if (progress.completedAt) {
          console.log(`    Completed: ${progress.completedAt}`);
        }
      }
    }

    // Check available exams in database
    console.log('\n\n📚 AVAILABLE EXAMS IN SYSTEM:');
    console.log('-'.repeat(60));
    
    const allExams = await Exam.find({ isActive: true })
      .select('title examGroup order isActive')
      .sort({ examGroup: 1, order: 1 });
    
    console.log(`Total active exams: ${allExams.length}`);
    
    const examsByGroup = {};
    allExams.forEach(exam => {
      if (!examsByGroup[exam.examGroup]) {
        examsByGroup[exam.examGroup] = [];
      }
      examsByGroup[exam.examGroup].push(exam);
    });
    
    console.log('\nExams by Group:');
    Object.entries(examsByGroup).forEach(([group, exams]) => {
      console.log(`\n  Group ${group}: ${exams.length} exam(s)`);
      exams.slice(0, 3).forEach(exam => {
        console.log(`    - ${exam.title} (Order: ${exam.order})`);
      });
      if (exams.length > 3) {
        console.log(`    ... and ${exams.length - 3} more`);
      }
    });

    console.log('\n\n' + '='.repeat(60));
    console.log('DIAGNOSIS COMPLETE');
    console.log('='.repeat(60));

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkStudent();

