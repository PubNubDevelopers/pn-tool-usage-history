const axios = require('axios');

const INTERNAL_ADMIN_URL = 'https://internal-admin.pubnub.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { keyid, token, accountid, subscribekey } = event.queryStringParameters || {};

  if (!keyid || !token) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing keyid or token' }),
    };
  }

  try {
    // Try the direct key endpoint first
    const response = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/functions/key/${keyid}`,
      {
        headers: { 'X-Session-Token': token },
        timeout: 10000,
      }
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response.data || { modules: [] }),
    };
  } catch (error) {
    // If the first endpoint fails, the keyset might not have functions configured
    // Return empty result rather than error
    if (error.response?.status === 404 || error.response?.status === 400) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: [] }),
      };
    }

    console.error('Functions error:', error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to fetch functions',
        details: error.response?.data || error.message,
      }),
    };
  }
};
