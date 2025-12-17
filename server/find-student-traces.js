require('dotenv').config();
const mongoose = require('mongoose');

const studentInfo = {
  name: "عمر احمد مصطفى",
  phone: "0599086447"
};

async function findStudentTraces() {
  try {
    console.log('\n=== SEARCHING FOR STUDENT TRACES ===\n');
    console.log('Student Name:', studentInfo.name);
    console.log('Phone:', studentInfo.phone);
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qudrat-platform', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to database\n');

    // Check if student exists but is inactive
    const User = require('./models/User');
    console.log('1. Checking for inactive student...');
    const inactiveStudent = await User.findOne({
      name: { $regex: studentInfo.name, $options: 'i' },
      isActive: false
    });
    
    if (inactiveStudent) {
      console.log('   ✅ FOUND! Student exists but is INACTIVE');
      console.log('   ID:', inactiveStudent._id);
      console.log('   Email:', inactiveStudent.email);
      console.log('   Can be reactivated!\n');
      return inactiveStudent;
    }
    console.log('   ❌ Not found as inactive\n');

    // Search for similar names
    console.log('2. Searching for similar names...');
    const similarStudents = await User.find({
      role: 'student',
      $or: [
        { name: { $regex: 'عمر', $options: 'i' } },
        { name: { $regex: 'احمد', $options: 'i' } },
        { name: { $regex: 'مصطفى', $options: 'i' } },
        { phoneNumber: { $regex: '0599086447' } },
        { phoneNumber: { $regex: '059.*908.*6447' } }
      ]
    }).select('name email phoneNumber isActive createdAt');

    if (similarStudents.length > 0) {
      console.log(`   ✅ Found ${similarStudents.length} similar students:`);
      similarStudents.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.name} - ${s.phoneNumber} - ${s.email}`);
        console.log(`      Active: ${s.isActive}, Created: ${s.createdAt}`);
      });
      console.log('\n   ⚠️  Check if any of these is the correct student\n');
    } else {
      console.log('   ❌ No similar students found\n');
    }

    // Check exam submissions for this phone/name in any records
    console.log('3. Checking exam history for traces...');
    const allStudents = await User.find({
      role: 'student',
      'examProgress.0': { $exists: true }
    }).select('name phoneNumber examProgress');

    let foundInProgress = false;
    for (const student of allStudents) {
      // Check if exam progress has any metadata that might reference deleted student
      if (student.examProgress.some(p => p.studentNote?.includes(studentInfo.name) || 
                                           p.studentNote?.includes(studentInfo.phone))) {
        console.log('   ✅ Found reference in:', student.name);
        foundInProgress = true;
      }
    }
    
    if (!foundInProgress) {
      console.log('   ❌ No traces found in exam history\n');
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SEARCH COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('Result: Student data is PERMANENTLY DELETED\n');
    console.log('Next Steps:');
    console.log('1. Ask if anyone has screenshots or exported reports');
    console.log('2. Check if the student remembers their email/password');
    console.log('3. Recreate the account with known information\n');

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

findStudentTraces()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

