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

    console.log('Search results for', email, ':', {
      userCount: response.data.users?.length || 0,
      users: response.data.users?.map((u: any) => ({
        userId: u.user_id,
        email: u.email,
        accountId: u.account?.id,
        accountEmail: u.account?.email
      }))
    });
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
        params: { owner_id: ownerid, limit: 1000, search: '' }
      }
    );

    console.log('Apps response for owner', ownerid, ':', {
      totalApps: response.data.result?.length || 0,
      total: response.data.total,
      hasResult: !!response.data.result,
      sampleApp: response.data.result?.[0] ? {
        id: response.data.result[0].id,
        name: response.data.result[0].name,
        enabled: response.data.result[0].enabled,
        disabled: response.data.result[0].disabled,
        status: response.data.result[0].status,
        allKeys: Object.keys(response.data.result[0])
      } : null
    });

    // Filter out disabled apps (keep only enabled apps)
    let apps = response.data.result || [];
    const beforeFilter = apps.length;

    // Apps can be marked as disabled in different ways, check multiple fields
    apps = apps.filter((app: any) => {
      // If there's an 'enabled' field and it's false, filter it out
      if (app.hasOwnProperty('enabled') && app.enabled === false) return false;
      // If there's a 'disabled' field and it's true, filter it out
      if (app.hasOwnProperty('disabled') && app.disabled === true) return false;
      // If there's a 'status' field and it's not 'enabled' or 'active', filter it out
      if (app.status && !['enabled', 'active'].includes(app.status.toLowerCase())) return false;
      // Otherwise, include it
      return true;
    });

    console.log(`Filtered ${beforeFilter - apps.length} disabled apps, ${apps.length} enabled apps remaining`);

    res.json({
      ...response.data,
      result: apps,
      total: apps.length
    });
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

    console.log('Keys response status:', response.status);
    console.log('Keys response data keys:', Object.keys(response.data));

    // Filter out disabled keysets (keep only enabled keysets)
    let keys = response.data.result || response.data || [];
    const beforeFilter = keys.length;

    if (keys.length > 0) {
      console.log('Sample key structure (first keyset):');
      console.log(JSON.stringify(keys[0], null, 2));
      console.log('pnconfig from first keyset:', keys[0].pnconfig);
    }

    // Keysets can be marked as disabled in different ways, check multiple fields
    keys = keys.filter((key: any) => {
      // If there's an 'enabled' field and it's false, filter it out
      if (key.hasOwnProperty('enabled') && key.enabled === false) return false;
      // If there's a 'disabled' field and it's true, filter it out
      if (key.hasOwnProperty('disabled') && key.disabled === true) return false;
      // If there's a 'status' field and it's not 'enabled' or 'active', filter it out
      if (key.status && !['enabled', 'active'].includes(key.status.toLowerCase())) return false;
      // Otherwise, include it
      return true;
    });

    console.log(`Filtered ${beforeFilter - keys.length} disabled keysets, ${keys.length} enabled keysets remaining`);

    res.json(keys);
  } catch (error: any) {
    console.error('Keys error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch keys',
      details: error.response?.data || error.message,
    });
  }
});

// Get detailed keyset configuration
app.get('/keyset-details', async (req, res) => {
  console.log('GET /keyset-details', req.query);

  const { keyid, token } = req.query as { keyid: string; token: string };

  if (!keyid || !token) {
    return res.status(400).json({ error: 'Missing keyid or token' });
  }

  try {
    // Fetch keyset details from internal admin API
    const response = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/app/keys/${keyid}`,
      {
        headers: { 'X-Session-Token': token }
      }
    );

    console.log('Keyset details response status:', response.status);
    console.log('Keyset details response keys:', Object.keys(response.data));
    if (response.data.pnconfig) {
      console.log('pnconfig keys:', Object.keys(response.data.pnconfig));
      console.log('pnconfig sample:', JSON.stringify(response.data.pnconfig).substring(0, 500));
    }
    if (response.data.properties) {
      console.log('properties keys:', Object.keys(response.data.properties));
    }

    res.json(response.data);
  } catch (error: any) {
    console.error('Keyset details error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch keyset details',
      details: error.response?.data || error.message,
    });
  }
});

// Get Functions for a keyset
app.get('/functions', async (req, res) => {
  console.log('GET /functions', req.query);

  const { keyid, token } = req.query as { keyid: string; token: string };

  if (!keyid || !token) {
    return res.status(400).json({ error: 'Missing keyid or token' });
  }

  try {
    const response = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/functions/key/${keyid}`,
      {
        headers: { 'X-Session-Token': token },
        timeout: 10000,
      }
    );

    console.log('Functions response status:', response.status);
    console.log('Functions count:', response.data?.modules?.length || 0);

    res.json(response.data);
  } catch (error: any) {
    console.error('Functions error:', error.response?.data || error.message);
    // Return empty result instead of error for functions (not all keysets have functions)
    res.json({ modules: [] });
  }
});

// Get Events & Actions for a keyset
app.get('/events-actions', async (req, res) => {
  console.log('GET /events-actions', req.query);

  const { keyid, token } = req.query as { keyid: string; token: string };

  if (!keyid || !token) {
    return res.status(400).json({ error: 'Missing keyid or token' });
  }

  try {
    const response = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/events-actions/key/${keyid}`,
      {
        headers: { 'X-Session-Token': token },
        timeout: 10000,
      }
    );

    console.log('Events & Actions response status:', response.status);
    console.log('Listeners count:', response.data?.listeners?.length || 0);
    console.log('Actions count:', response.data?.actions?.length || 0);

    res.json(response.data);
  } catch (error: any) {
    console.error('Events & Actions error:', error.response?.data || error.message);
    // Return empty result instead of error (not all keysets have events & actions)
    res.json({ listeners: [], actions: [] });
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
