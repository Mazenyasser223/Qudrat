const axios = require('axios');

async function testRailwayDatabase() {
  try {
    console.log('Testing Railway backend database connection...');
    
    // Test the health endpoint first
    const healthResponse = await axios.get('https://qudrat-production-024a.up.railway.app/api/health');
    console.log('✅ Backend health check:', healthResponse.data);
    
    // Test login to see if database is working
    console.log('\nTesting login (this will test database connection)...');
    const loginResponse = await axios.post('https://qudrat-production-024a.up.railway.app/api/auth/login', {
      email: 'mazen@qudrat.com',
      password: 'mazen123'
    });
    
    console.log('✅ Login successful:', {
      success: loginResponse.data.success,
      user: loginResponse.data.user
    });
    
    // Test getting user profile (this requires database access)
    console.log('\nTesting user profile endpoint...');
    const profileResponse = await axios.get('https://qudrat-production-024a.up.railway.app/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.token}`
      }
    });
    
    console.log('✅ User profile retrieved:', profileResponse.data);
    
  } catch (error) {
    console.log('❌ Railway backend test failed:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
      
      if (error.response.status === 500) {
        console.log('🔍 This might be a database connection issue');
      }
    }
  }
}

testRailwayDatabase();
