require('dotenv').config();
const mongoose = require('mongoose');

const studentData = {
  name: "عمر احمد مصطفى",
  phoneNumber: "0599086447"
};

async function extractStudentFromBackup() {
  try {
    // Get the backup cluster connection string from command line
    const backupConnectionString = process.argv[2];
    
    if (!backupConnectionString) {
      console.log('\n❌ ERROR: Please provide backup cluster connection string');
      console.log('\nUsage: node extract-from-backup.js "mongodb+srv://user:pass@backup-cluster.mongodb.net"');
      console.log('\nTo get your backup cluster connection string:');
      console.log('1. Go to MongoDB Atlas → Restored Cluster');
      console.log('2. Click "Connect"');
      console.log('3. Choose "Connect your application"');
      console.log('4. Copy the connection string\n');
      process.exit(1);
    }

    console.log('\n=== CONNECTING TO BACKUP CLUSTER ===');
    await mongoose.connect(backupConnectionString, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to backup cluster successfully\n');

    // Find the student in the backup
    console.log('=== SEARCHING FOR STUDENT IN BACKUP ===');
    console.log('Name:', studentData.name);
    console.log('Phone:', studentData.phoneNumber, '\n');

    const User = mongoose.model('User', require('./models/User').schema);
    
    const student = await User.findOne({
      $or: [
        { name: studentData.name },
        { phoneNumber: studentData.phoneNumber },
        { phoneNumber: "0 59 908 6447" },
        { phoneNumber: "059 908 6447" },
      ]
    }).select('-password'); // Exclude password for security

    if (!student) {
      console.log('❌ Student NOT found in backup cluster');
      console.log('\nPossible reasons:');
      console.log('1. The backup is from AFTER the deletion');
      console.log('2. The student name/phone doesn't match exactly');
      console.log('3. Try an earlier backup snapshot\n');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log('✅ STUDENT FOUND IN BACKUP!\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STUDENT DATA RECOVERED:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('ID:', student._id);
    console.log('Name:', student.name);
    console.log('Email:', student.email);
    console.log('Phone:', student.phoneNumber);
    console.log('Role:', student.role);
    console.log('Active:', student.isActive);
    console.log('Created:', student.createdAt);
    console.log('Last Login:', student.lastLogin || 'Never');
    console.log('Total Score:', student.totalScore || 0);
    console.log('Overall %:', student.overallPercentage || 0);
    console.log('Exam Progress Count:', student.examProgress?.length || 0);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Save to JSON file
    const fs = require('fs');
    const filename = `student-${student._id}-backup.json`;
    
    fs.writeFileSync(
      filename,
      JSON.stringify(student.toObject(), null, 2),
      'utf8'
    );
    
    console.log('✅ Student data exported to:', filename);
    console.log('\n=== NEXT STEPS ===');
    console.log('Run: node restore-from-backup.js', filename);
    console.log('This will restore the student to your production database\n');

    await mongoose.connection.close();
    console.log('Disconnected from backup cluster\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.name === 'MongoServerError') {
      console.error('Check your connection string and credentials');
    }
    process.exit(1);
  }
}

extractStudentFromBackup();

