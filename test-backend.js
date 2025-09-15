const axios = require('axios');

async function testBackend() {
  try {
    console.log('Testing Railway backend...');
    
    // Test if backend is accessible
    const response = await axios.get('https://qudrat-production-024a.up.railway.app/api/auth/me');
    console.log('Backend is accessible:', response.status);
  } catch (error) {
    console.log('Backend test failed:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
  
  try {
    // Test login endpoint
    console.log('\nTesting login endpoint...');
    const loginResponse = await axios.post('https://qudrat-production-024a.up.railway.app/api/auth/login', {
      email: 'mazen@qudrat.com',
      password: 'mazen123'
    });
    console.log('Login test successful:', loginResponse.data);
  } catch (error) {
    console.log('Login test failed:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testBackend();
