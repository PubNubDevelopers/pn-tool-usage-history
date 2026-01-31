const axios = require('axios');

const INTERNAL_ADMIN_URL = 'https://internal-admin.pubnub.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { ownerid, token } = event.queryStringParameters || {};

  if (!ownerid || !token) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing ownerid or token' }),
    };
  }

  try {
    const response = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/apps-simplified`,
      {
        headers: { 'X-Session-Token': token },
        params: { owner_id: ownerid, limit: 100, search: '' },
      }
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error('Apps error:', error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to fetch apps',
        details: error.response?.data || error.message,
      }),
    };
  }
};
