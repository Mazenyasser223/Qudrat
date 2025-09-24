/**
 * Test script for the exam reopen functionality
 * This script tests the new reopen exam feature end-to-end
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const TEST_CREDENTIALS = {
  email: 'teacher@example.com', // Replace with actual teacher credentials
  password: 'password123'
};

let authToken = null;

async function testReopenFunctionality() {
  console.log('🧪 Testing Exam Reopen Functionality');
  console.log('=====================================\n');

  try {
    // Step 1: Login as teacher
    console.log('1️⃣ Logging in as teacher...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, TEST_CREDENTIALS);
    
    if (loginResponse.data.success) {
      authToken = loginResponse.data.token;
      console.log('✅ Login successful');
    } else {
      throw new Error('Login failed');
    }

    // Step 2: Get students list
    console.log('\n2️⃣ Fetching students list...');
    const studentsResponse = await axios.get(`${API_BASE_URL}/users/students`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (studentsResponse.data.success && studentsResponse.data.data.length > 0) {
      const student = studentsResponse.data.data[0];
      console.log(`✅ Found student: ${student.name} (${student._id})`);
      
      // Step 3: Get student profile to find completed exams
      console.log('\n3️⃣ Fetching student profile...');
      const studentProfileResponse = await axios.get(`${API_BASE_URL}/users/students/${student._id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (studentProfileResponse.data.success) {
        const studentData = studentProfileResponse.data.data;
        console.log(`✅ Student profile loaded`);
        
        // Find completed exams
        const completedExams = studentData.examProgress.filter(progress => progress.status === 'completed');
        console.log(`📊 Found ${completedExams.length} completed exams`);

        if (completedExams.length > 0) {
          const examToReopen = completedExams[0];
          console.log(`\n4️⃣ Testing reopen functionality for exam: ${examToReopen.examId}`);
          
          // Step 4: Test reopen exam
          const reopenResponse = await axios.put(
            `${API_BASE_URL}/users/students/${student._id}/reopen-exam/${examToReopen.examId}`,
            {},
            { headers: { Authorization: `Bearer ${authToken}` } }
          );

          if (reopenResponse.data.success) {
            console.log('✅ Exam reopened successfully!');
            console.log(`📝 Response: ${reopenResponse.data.message}`);
            console.log(`🔄 Attempt number: ${reopenResponse.data.data.attemptNumber}`);
            console.log(`📚 Previous attempts: ${reopenResponse.data.data.previousAttempts}`);

            // Step 5: Verify the change by fetching student profile again
            console.log('\n5️⃣ Verifying the change...');
            const verifyResponse = await axios.get(`${API_BASE_URL}/users/students/${student._id}`, {
              headers: { Authorization: `Bearer ${authToken}` }
            });

            if (verifyResponse.data.success) {
              const updatedStudent = verifyResponse.data.data;
              const updatedProgress = updatedStudent.examProgress.find(
                p => p.examId.toString() === examToReopen.examId.toString()
              );

              if (updatedProgress) {
                console.log('✅ Verification successful!');
                console.log(`📊 New status: ${updatedProgress.status}`);
                console.log(`🔄 Attempt number: ${updatedProgress.attemptNumber}`);
                console.log(`📚 Previous attempts count: ${updatedProgress.previousAttempts?.length || 0}`);
                
                if (updatedProgress.status === 'unlocked' && updatedProgress.attemptNumber > 1) {
                  console.log('\n🎉 SUCCESS: Exam reopen functionality is working correctly!');
                  console.log('   - Exam status changed from "completed" to "unlocked"');
                  console.log('   - Attempt number increased');
                  console.log('   - Previous attempt data preserved');
                } else {
                  console.log('\n❌ FAILURE: Exam reopen did not work as expected');
                }
              } else {
                console.log('❌ Could not find updated progress');
              }
            } else {
              console.log('❌ Failed to verify changes');
            }
          } else {
            console.log('❌ Failed to reopen exam');
            console.log(`Error: ${reopenResponse.data.message}`);
          }
        } else {
          console.log('⚠️  No completed exams found to test reopen functionality');
          console.log('   Please complete an exam first to test this feature');
        }
      } else {
        console.log('❌ Failed to fetch student profile');
      }
    } else {
      console.log('❌ No students found');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testReopenFunctionality().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('💥 Test crashed:', error);
});
