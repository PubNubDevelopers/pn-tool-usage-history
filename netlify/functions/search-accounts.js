const axios = require('axios');

const INTERNAL_ADMIN_URL = 'https://internal-admin.pubnub.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email, token } = event.queryStringParameters || {};

  if (!email || !token) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing email or token' }),
    };
  }

  try {
    const response = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/users`,
      { 
        headers: { 'X-Session-Token': token },
        params: { search: email }
      }
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to search accounts',
        details: error.response?.data || error.message,
      }),
    };
  }
};
