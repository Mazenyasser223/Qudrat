require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Exam = require('./models/Exam');

const studentData = {
  name: "عمر احمد مصطفى",
  phoneNumber: "0599086447" // Cleaned format
};

async function restoreStudent() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qudrat-platform', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Database connected successfully');

    // First, check if student still exists (maybe soft deleted or just deactivated)
    console.log('\n=== SEARCHING FOR STUDENT ===');
    const existingStudent = await User.findOne({
      $or: [
        { name: studentData.name },
        { phoneNumber: studentData.phoneNumber },
        { phoneNumber: "0 59 908 6447" }, // Original format with spaces
        { phoneNumber: "059 908 6447" },
        { phoneNumber: "+962599086447" }, // Possible variations
      ]
    });

    if (existingStudent) {
      console.log('✅ STUDENT FOUND IN DATABASE!');
      console.log('Student ID:', existingStudent._id);
      console.log('Name:', existingStudent.name);
      console.log('Email:', existingStudent.email);
      console.log('Phone:', existingStudent.phoneNumber);
      console.log('Role:', existingStudent.role);
      console.log('Active:', existingStudent.isActive);
      console.log('Created:', existingStudent.createdAt);
      console.log('Exam Progress Count:', existingStudent.examProgress?.length || 0);
      
      if (!existingStudent.isActive) {
        console.log('\n⚠️  Student exists but is INACTIVE');
        console.log('Would you like to reactivate? Set isActive to true in the database.');
      }
      
      return existingStudent;
    }

    console.log('❌ Student NOT found in database');
    console.log('\n=== ATTEMPTING RECOVERY OPTIONS ===');
    
    // Check MongoDB oplogs (if available) - this requires admin access
    console.log('\n1. Checking if MongoDB oplogs are available...');
    try {
      const admin = mongoose.connection.db.admin();
      const serverStatus = await admin.serverStatus();
      if (serverStatus.repl && serverStatus.repl.ismaster) {
        console.log('   ℹ️  MongoDB replica set detected - oplogs may be available');
        console.log('   ℹ️  Contact your database administrator to restore from oplogs');
      } else {
        console.log('   ❌ No replica set - oplog recovery not available');
      }
    } catch (err) {
      console.log('   ❌ Cannot access MongoDB admin functions:', err.message);
    }

    // Check for backup files
    console.log('\n2. Checking for backup files...');
    console.log('   ℹ️  No automated backup system found in the codebase');
    console.log('   ℹ️  Check your hosting provider for automatic backups');

    // Option to recreate
    console.log('\n=== STUDENT RECREATION OPTIONS ===');
    console.log('To recreate the student, you will need:');
    console.log('  1. Email address (for login)');
    console.log('  2. Password (to set for the account)');
    console.log('  3. Any exam progress data you have');
    console.log('\n✅ Ready to recreate student with available information');
    console.log('   Name: عمر احمد مصطفى');
    console.log('   Phone: 0599086447');
    console.log('   Please provide email and password to proceed');

    return null;

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

async function recreateStudent(email, password) {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qudrat-platform', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Database connected successfully');

    console.log('\n=== RECREATING STUDENT ===');
    
    // Check if email or phone already exists
    const existing = await User.findOne({
      $or: [
        { email: email },
        { phoneNumber: studentData.phoneNumber }
      ]
    });

    if (existing) {
      console.log('❌ A user with this email or phone already exists!');
      console.log('Existing user:', existing.name, existing.email, existing.phoneNumber);
      return null;
    }

    // Create the student
    const student = await User.create({
      name: studentData.name,
      email: email,
      password: password,
      phoneNumber: studentData.phoneNumber,
      role: 'student',
      isActive: true
    });

    console.log('✅ Student created successfully!');
    console.log('Student ID:', student._id);
    console.log('Name:', student.name);
    console.log('Email:', student.email);
    console.log('Phone:', student.phoneNumber);

    // Initialize exam progress
    console.log('\n=== INITIALIZING EXAM PROGRESS ===');
    const exams = await Exam.find({ isActive: true }).sort({ examGroup: 1, order: 1 });
    const examProgress = exams.map((exam) => ({
      examGroup: exam.examGroup,
      examId: exam._id,
      status: 'locked'
    }));

    student.examProgress = examProgress;
    await student.save();
    console.log('✅ Initialized progress for', examProgress.length, 'exams');

    return student;

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

if (command === 'recreate') {
  const email = args[1];
  const password = args[2];
  
  if (!email || !password) {
    console.log('Usage: node restore-student.js recreate <email> <password>');
    console.log('Example: node restore-student.js recreate omar@example.com Password123');
    process.exit(1);
  }
  
  recreateStudent(email, password)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  restoreStudent()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

