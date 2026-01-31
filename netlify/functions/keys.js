const axios = require('axios');

const INTERNAL_ADMIN_URL = 'https://internal-admin.pubnub.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { appid, token } = event.queryStringParameters || {};

  if (!appid || !token) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing appid or token' }),
    };
  }

  try {
    const response = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/app/keys`,
      {
        headers: { 'X-Session-Token': token },
        params: { app_id: appid, page: 1, limit: 99 },
      }
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response.data.result || response.data || []),
    };
  } catch (error) {
    console.error('Keys error:', error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to fetch keys',
        details: error.response?.data || error.message,
      }),
    };
  }
};
