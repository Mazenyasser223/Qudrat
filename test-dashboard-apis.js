const axios = require('axios');

async function testDashboardAPIs() {
  try {
    console.log('Testing Dashboard API endpoints...');
    
    // First, login to get a token
    const loginResponse = await axios.post('https://qudrat-production-024a.up.railway.app/api/auth/login', {
      email: 'mazen@qudrat.com',
      password: 'mazen123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token obtained');
    
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    // Test dashboard statistics endpoint
    console.log('\n1. Testing dashboard statistics...');
    try {
      const statsResponse = await axios.get('https://qudrat-production-024a.up.railway.app/api/users/dashboard-stats', { headers });
      console.log('✅ Dashboard stats:', statsResponse.data);
    } catch (error) {
      console.log('❌ Dashboard stats failed:', error.response?.data || error.message);
    }
    
    // Test students endpoint
    console.log('\n2. Testing students endpoint...');
    try {
      const studentsResponse = await axios.get('https://qudrat-production-024a.up.railway.app/api/users/students', { headers });
      console.log('✅ Students data:', studentsResponse.data);
    } catch (error) {
      console.log('❌ Students endpoint failed:', error.response?.data || error.message);
    }
    
    // Test analytics endpoint
    console.log('\n3. Testing analytics endpoint...');
    try {
      const analyticsResponse = await axios.get('https://qudrat-production-024a.up.railway.app/api/users/analytics', { headers });
      console.log('✅ Analytics data:', analyticsResponse.data);
    } catch (error) {
      console.log('❌ Analytics endpoint failed:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testDashboardAPIs();
