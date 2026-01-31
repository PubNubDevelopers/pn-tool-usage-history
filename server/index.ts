import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dayjs from 'dayjs';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const port = process.env.PORT || 5050;
const PUBNUB_ADMIN_URL = 'https://admin.pubnub.com';
const INTERNAL_ADMIN_URL = 'https://internal-admin.pubnub.com';

// Test endpoint
app.get('/test', (_req, res) => {
  res.json({ status: 'ok', message: 'PubNub Account Usage API is running' });
});

// Login - authenticate and get accounts
app.get('/login', async (req, res) => {
  console.log('POST /login');
  
  const { username, password } = req.query as { username: string; password: string };
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  try {
    // Step 1: Authenticate (use internal admin API)
    const authResponse = await axios.post(`${INTERNAL_ADMIN_URL}/api/me`, {
      email: username,
      password: password,
    });

    const authResult = authResponse.data.result;
    if (!authResult) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const token = authResult.token;
    const userId = authResult.user_id;
    const accountId = authResult.user?.account_id;

    // Step 2: Get accounts (use internal admin API)
    const accountsResponse = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/accounts?user_id=${userId}`,
      { headers: { 'X-Session-Token': token } }
    );

    const accounts = accountsResponse.data.result?.accounts || [];

    res.json({
      session: {
        userid: userId,
        token: token,
        accountid: accountId,
      },
      accounts: accounts,
    });
  } catch (error: any) {
    console.error('Login error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Login failed',
      details: error.response?.data || error.message,
    });
  }
});

// Search for accounts by email
app.get('/search-accounts', async (req, res) => {
  console.log('GET /search-accounts', req.query);
  
  const { email, token } = req.query as { email: string; token: string };

  if (!email || !token) {
    return res.status(400).json({ error: 'Missing email or token' });
  }

  try {
    // Use the internal admin users search endpoint
    const response = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/users`,
      { 
        headers: { 'X-Session-Token': token },
        params: { search: email }
      }
    );

    console.log('Search results:', response.data);
    res.json(response.data);
  } catch (error: any) {
    console.error('Account search error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to search accounts',
      details: error.response?.data || error.message,
    });
  }
});

// Get apps for an account (using internal admin API)
app.get('/apps', async (req, res) => {
  console.log('GET /apps', req.query);
  
  const { ownerid, token } = req.query as { ownerid: string; token: string };

  if (!ownerid || !token) {
    return res.status(400).json({ error: 'Missing ownerid or token' });
  }

  try {
    // Use internal admin API for ghosting/impersonating customer accounts
    const response = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/apps-simplified`,
      { 
        headers: { 'X-Session-Token': token },
        params: { owner_id: ownerid, limit: 100, search: '' }
      }
    );

    console.log('Apps response:', response.data);
    res.json(response.data);
  } catch (error: any) {
    console.error('Apps error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch apps',
      details: error.response?.data || error.message,
    });
  }
});

// Get keys for an app (using internal admin API)
app.get('/keys', async (req, res) => {
  console.log('GET /keys', req.query);
  
  const { appid, token } = req.query as { appid: string; token: string };

  if (!appid || !token) {
    return res.status(400).json({ error: 'Missing appid or token' });
  }

  try {
    // Use internal admin API
    const response = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/app/keys`,
      { 
        headers: { 'X-Session-Token': token },
        params: { app_id: appid, page: 1, limit: 99 }
      }
    );

    console.log('Keys response:', response.data);
    if (response.data.result && response.data.result.length > 0) {
      console.log('Sample key structure:', JSON.stringify(response.data.result[0], null, 2));
    }
    res.json(response.data.result || response.data || []);
  } catch (error: any) {
    console.error('Keys error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch keys',
      details: error.response?.data || error.message,
    });
  }
});

// Get usage metrics (using internal admin API)
app.get('/key-usage', async (req, res) => {
  console.log('GET /key-usage', req.query);
  
  const { keyid, appid, accountid, token, start, end } = req.query as {
    keyid?: string;
    appid?: string;
    accountid?: string;
    token: string;
    start?: string;
    end?: string;
  };

  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  // Default date range: last 7 days
  const startDate = start || dayjs().subtract(7, 'day').format('YYYY-MM-DD');
  const endDate = end || dayjs().format('YYYY-MM-DD');

  // Build URL based on scope - use internal admin API
  let usageUrl: string;
  if (keyid && keyid !== 'all-keys') {
    usageUrl = `${INTERNAL_ADMIN_URL}/api/v4/services/usage/legacy/usage?key_id=${keyid}&usageType=transaction&file_format=json&start=${startDate}&end=${endDate}`;
  } else if (appid && appid !== 'all-apps') {
    usageUrl = `${INTERNAL_ADMIN_URL}/api/v4/services/usage/legacy/usage?app_id=${appid}&usageType=transaction&file_format=json&start=${startDate}&end=${endDate}`;
  } else if (accountid) {
    usageUrl = `${INTERNAL_ADMIN_URL}/api/v4/services/usage/legacy/usage?account_id=${accountid}&usageType=transaction&file_format=json&start=${startDate}&end=${endDate}`;
  } else {
    return res.status(400).json({ error: 'Missing keyid, appid, or accountid' });
  }

  console.log('Usage URL:', usageUrl);

  try {
    const response = await axios.get(usageUrl, {
      headers: { 'X-Session-Token': token },
    });

    console.log('Usage data received:', Object.keys(response.data).length, 'metrics');
    console.log('Sample metric names:', Object.keys(response.data).slice(0, 10));
    console.log('First metric structure:', Object.keys(response.data)[0], ':', 
      JSON.stringify(Object.values(response.data)[0]).substring(0, 200));
    res.json(response.data);
  } catch (error: any) {
    console.error('Usage error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch usage',
      details: error.response?.data || error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 PubNub Account Usage API running on port ${port}`);
});
