const axios = require('axios');

const INTERNAL_ADMIN_URL = 'https://internal-admin.pubnub.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { username, password } = event.queryStringParameters || {};

  if (!username || !password) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing username or password' }),
    };
  }

  try {
    console.log('Attempting authentication for:', username);
    
    // Step 1: Authenticate with internal-admin.pubnub.com
    const authResponse = await axios.post(
      `${INTERNAL_ADMIN_URL}/api/me`,
      { email: username, password: password },
      { timeout: 20000 }
    );

    console.log('Auth successful, userId:', authResponse.data.id);
    const { id: userId, token } = authResponse.data;

    // Step 2: Get accounts
    const accountsResponse = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/accounts?user_id=${userId}`,
      { 
        headers: { 'X-Session-Token': token },
        timeout: 20000
      }
    );

    console.log('Accounts fetched:', accountsResponse.data.length || 0);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: { userId, token },
        accounts: accountsResponse.data,
      }),
    };
  } catch (error) {
    console.error('Login error:', error.message);
    console.error('Error details:', JSON.stringify({
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
    }));
    
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Authentication failed',
        details: error.response?.data || error.message,
      }),
    };
  }
};
