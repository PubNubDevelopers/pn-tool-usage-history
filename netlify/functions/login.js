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
    // Step 1: Authenticate
    const authResponse = await axios.post(`${INTERNAL_ADMIN_URL}/api/me`, {
      email: username,
      password: password,
    });

    const { id: userId, token } = authResponse.data;

    // Step 2: Get accounts
    const accountsResponse = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/accounts?user_id=${userId}`,
      { headers: { 'X-Session-Token': token } }
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: { userId, token },
        accounts: accountsResponse.data,
      }),
    };
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
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
