require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const User = require('./models/User');

async function restoreStudentToProduction() {
  try {
    const backupFile = process.argv[2];
    
    if (!backupFile) {
      console.log('\n❌ ERROR: Please provide backup file');
      console.log('Usage: node restore-from-backup.js student-XXX-backup.json\n');
      process.exit(1);
    }

    // Check if file exists
    if (!fs.existsSync(backupFile)) {
      console.log(`\n❌ ERROR: File not found: ${backupFile}\n`);
      process.exit(1);
    }

    console.log('\n=== READING BACKUP FILE ===');
    const studentData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    console.log('✅ Backup file loaded');
    console.log('Student:', studentData.name);
    console.log('Email:', studentData.email);
    console.log('Phone:', studentData.phoneNumber, '\n');

    console.log('=== CONNECTING TO PRODUCTION DATABASE ===');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qudrat-platform', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to production database\n');

    // Check if student already exists in production
    console.log('=== CHECKING FOR EXISTING STUDENT ===');
    const existingStudent = await User.findOne({
      $or: [
        { email: studentData.email },
        { phoneNumber: studentData.phoneNumber }
      ]
    });

    if (existingStudent) {
      console.log('⚠️  WARNING: Student already exists in production!');
      console.log('Existing student ID:', existingStudent._id);
      console.log('Existing student name:', existingStudent.name);
      console.log('\nOptions:');
      console.log('1. The student was already restored');
      console.log('2. Delete the existing student first if you want to re-restore');
      console.log('3. Update the existing student manually\n');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log('✅ No existing student found - safe to restore\n');

    // Prepare student data for restoration
    const restoreData = {
      ...studentData,
      _id: undefined, // Let MongoDB create new ID or keep old one
      password: studentData.password || 'TemporaryPassword123!', // Set temp password if needed
      createdAt: studentData.createdAt || new Date(),
      updatedAt: new Date(),
    };

    // Remove undefined fields
    Object.keys(restoreData).forEach(key => {
      if (restoreData[key] === undefined) {
        delete restoreData[key];
      }
    });

    console.log('=== RESTORING STUDENT TO PRODUCTION ===');
    
    // Create student with original ID if possible
    const restoredStudent = await User.create({
      ...restoreData,
      // If password was in backup (hashed), use it; otherwise set temp
      password: studentData.password || 'ChangeMe123!',
    });

    console.log('✅ STUDENT RESTORED SUCCESSFULLY!\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('RESTORED STUDENT:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('ID:', restoredStudent._id);
    console.log('Name:', restoredStudent.name);
    console.log('Email:', restoredStudent.email);
    console.log('Phone:', restoredStudent.phoneNumber);
    console.log('Exam Progress Restored:', restoredStudent.examProgress?.length || 0);
    console.log('Total Score Restored:', restoredStudent.totalScore || 0);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (!studentData.password) {
      console.log('⚠️  IMPORTANT: Password was not in backup');
      console.log('Temporary password set: ChangeMe123!');
      console.log('Student should reset their password on first login\n');
    }

    await mongoose.connection.close();
    console.log('✅ Restoration complete!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.code === 11000) {
      console.error('Duplicate key error - student with this email/phone already exists');
    }
    process.exit(1);
  }
}

restoreStudentToProduction();

