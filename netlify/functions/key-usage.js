const axios = require('axios');
const dayjs = require('dayjs');

const INTERNAL_ADMIN_URL = 'https://internal-admin.pubnub.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { keyid, appid, accountid, token, start, end } = event.queryStringParameters || {};

  if (!token) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing token' }),
    };
  }

  const startDate = start || dayjs().subtract(3, 'month').format('YYYY-MM-DD');
  const endDate = end || dayjs().format('YYYY-MM-DD');

  let usageUrl;

  if (keyid) {
    usageUrl = `${INTERNAL_ADMIN_URL}/api/v4/services/usage/legacy/usage?key_id=${keyid}&usageType=transaction&file_format=json&start=${startDate}&end=${endDate}`;
  } else if (appid) {
    usageUrl = `${INTERNAL_ADMIN_URL}/api/v4/services/usage/legacy/usage?app_id=${appid}&usageType=transaction&file_format=json&start=${startDate}&end=${endDate}`;
  } else if (accountid) {
    usageUrl = `${INTERNAL_ADMIN_URL}/api/v4/services/usage/legacy/usage?account_id=${accountid}&usageType=transaction&file_format=json&start=${startDate}&end=${endDate}`;
  } else {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing keyid, appid, or accountid' }),
    };
  }

  try {
    const response = await axios.get(usageUrl, {
      headers: { 'X-Session-Token': token },
    });

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
        error: 'Failed to fetch usage',
        details: error.response?.data || error.message,
      }),
    };
  }
};
