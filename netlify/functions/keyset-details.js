const axios = require('axios');

const INTERNAL_ADMIN_URL = 'https://internal-admin.pubnub.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { keyid, token } = event.queryStringParameters || {};

  if (!keyid || !token) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing keyid or token' }),
    };
  }

  try {
    // Fetch keyset details from internal admin API
    const response = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/key/${keyid}`,
      {
        headers: { 'X-Session-Token': token },
        timeout: 10000,
      }
    );

    // The response might be wrapped in 'result' or returned directly
    const data = response.data?.result || response.data || {};

    console.log(`[keyset-details] Key ${keyid}: Retrieved details`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Keyset details error:', error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to fetch keyset details',
        details: error.response?.data || error.message,
      }),
    };
  }
};
