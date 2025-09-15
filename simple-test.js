const axios = require('axios');

async function test() {
  try {
    console.log('Testing Railway backend...');
    const response = await axios.post('https://qudrat-production-024a.up.railway.app/api/auth/login', {
      email: 'mazen@qudrat.com',
      password: 'mazen123'
    });
    console.log('SUCCESS:', response.data);
  } catch (error) {
    console.log('ERROR:', error.response?.data || error.message);
  }
}

test();
