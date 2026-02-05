import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dayjs from 'dayjs';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const port = process.env.PORT || 5050;
const INTERNAL_ADMIN_URL = 'https://internal-admin.pubnub.com';

// Test endpoint
app.get('/test', (_req, res) => {
  res.json({ status: 'ok', message: 'PubNub Account Usage API is running' });
});

// Login - authenticate and get accounts
app.get('/login', async (req, res) => {
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
  const { email, token } = req.query as { email: string; token: string };

  if (!email || !token) {
    return res.status(400).json({ error: 'Missing email or token' });
  }

  try {
    console.log('[Account Search] Searching for email:', email);
    
    // Use /api/users which returns both accounts[] and users[]
    const response = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/users`,
      {
        headers: { 'X-Session-Token': token },
        params: { search: email }
      }
    );

    // IMPORTANT: The API returns both accounts[] and users[]
    // - accounts[]: actual account objects (what we want!)
    // - users[]: user objects (owner info)
    const accountsArray = response.data.accounts || [];
    const usersArray = response.data.users || [];
    
    console.log('[Account Search] API returned', accountsArray.length, 'accounts and', usersArray.length, 'users');
    
    // Prioritize accounts[] array if available, otherwise fall back to users[]
    let results = accountsArray.length > 0 ? accountsArray : usersArray;
    
    if (results.length > 0) {
      console.log('[Account Search] First result:', JSON.stringify(results[0], null, 2).substring(0, 500));
    }
    
    // Filter to only exact email matches (case-insensitive)
    // For accounts array: match against owner email (need to get from users array)
    // For users array: match against user email
    const searchEmailLower = email.toLowerCase().trim();
    
    let exactMatches: any[] = [];
    
    if (accountsArray.length > 0 && usersArray.length > 0) {
      // We have both arrays - match accounts where the owner's email matches
      exactMatches = accountsArray.filter((account: any) => {
        // Find the user who owns this account
        const owner = usersArray.find((user: any) => user.id === account.owner_id);
        const ownerEmail = owner?.email?.toLowerCase().trim();
        const matches = ownerEmail === searchEmailLower;
        
        console.log(`[Account Search] Account ${account.id}:`, {
          ownerId: account.owner_id,
          ownerEmail: owner?.email,
          matches
        });
        
        return matches;
      }).map((account: any) => {
        // Populate email field from owner for display purposes
        const owner = usersArray.find((user: any) => user.id === account.owner_id);
        return {
          ...account,
          email: owner?.email || account.email
        };
      });
    } else {
      // Fallback: just match directly on email
      exactMatches = results.filter((item: any) => {
        const itemEmail = item.email?.toLowerCase().trim();
        return itemEmail === searchEmailLower;
      });
    }

    console.log('[Account Search] Found', exactMatches.length, 'exact matches');
    
    // Log matches
    exactMatches.forEach((account: any, index: number) => {
      console.log(`[Account Search] Match ${index + 1}:`, {
        accountId: account.id,
        ownerId: account.owner_id,
        email: account.email
      });
    });

    // Return accounts in the format expected by frontend
    res.json({ users: exactMatches });
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
  const { ownerid, token } = req.query as { ownerid: string; token: string };

  if (!ownerid || !token) {
    return res.status(400).json({ error: 'Missing ownerid or token' });
  }

  try {
    console.log('[Apps] Fetching apps for owner_id:', ownerid);
    // Use internal admin API for ghosting/impersonating customer accounts
    const response = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/apps-simplified`,
      {
        headers: { 'X-Session-Token': token },
        params: { owner_id: ownerid, search: '' }
      }
    );
    console.log('[Apps] Found', response.data.result?.length || 0, 'apps');

    // Filter out disabled apps (keep only enabled apps)
    let apps = response.data.result || [];

    // Apps can be marked as disabled in different ways, check multiple fields
    apps = apps.filter((app: any) => {
      // If there's an 'enabled' field and it's false, filter it out
      if (app.hasOwnProperty('enabled') && app.enabled === false) return false;
      // If there's a 'disabled' field and it's true, filter it out
      if (app.hasOwnProperty('disabled') && app.disabled === true) return false;
      // If there's a 'status' field, check it - status can be a number (1 = enabled) or string
      if (app.status !== undefined && app.status !== null) {
        // If status is a number, 1 = enabled, 0 = disabled
        if (typeof app.status === 'number') {
          if (app.status === 0) return false;
        }
        // If status is a string, check if it's 'enabled' or 'active'
        else if (typeof app.status === 'string') {
          if (!['enabled', 'active'].includes(app.status.toLowerCase())) return false;
        }
      }
      // Otherwise, include it
      return true;
    });

    res.json({
      ...response.data,
      result: apps,
      total: apps.length
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch apps',
      details: error.response?.data || error.message,
    });
  }
});

// Get keys for an app (using internal admin API)
app.get('/keys', async (req, res) => {
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

    // Filter out disabled keysets (keep only enabled keysets)
    let keys = response.data.result || response.data || [];

    // Keysets can be marked as disabled in different ways, check multiple fields
    keys = keys.filter((key: any) => {
      // If there's an 'enabled' field and it's false, filter it out
      if (key.hasOwnProperty('enabled') && key.enabled === false) return false;
      // If there's a 'disabled' field and it's true, filter it out
      if (key.hasOwnProperty('disabled') && key.disabled === true) return false;
      // If there's a 'status' field, check it - status can be a number (1 = enabled) or string
      if (key.status !== undefined && key.status !== null) {
        // If status is a number, 1 = enabled, 0 = disabled
        if (typeof key.status === 'number') {
          if (key.status === 0) return false;
        }
        // If status is a string, check if it's 'enabled' or 'active'
        else if (typeof key.status === 'string') {
          if (!['enabled', 'active'].includes(key.status.toLowerCase())) return false;
        }
      }
      // Otherwise, include it
      return true;
    });

    res.json(keys);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch keys',
      details: error.response?.data || error.message,
    });
  }
});

// Get detailed keyset configuration
app.get('/keyset-details', async (req, res) => {
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

    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch keyset details',
      details: error.response?.data || error.message,
    });
  }
});

// Get Functions for a keyset using FaaS API
app.get('/functions', async (req, res) => {
  const { keyid, token, accountid, subscribekey } = req.query as { keyid: string; token: string; accountid?: string; subscribekey?: string };

  if (!keyid || !token) {
    return res.status(400).json({ error: 'Missing keyid or token' });
  }

  try {
    console.log(`[Functions] Fetching deployments for key ${keyid}, account ${accountid || 'default'}, subscribe key: ${subscribekey?.substring(0, 20)}...`);

    // Build headers with delegated account ID for proper ghosting
    const headers: any = {
      'X-Session-Token': token
    };

    if (accountid) {
      headers['x-pn-delegated-account-id'] = accountid;
      console.log('[Functions] Using x-pn-delegated-account-id header:', accountid);
    }

    // Step 1: Get all packages at account level
    const packagesResponse = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/faas/v1/packages`,
      {
        headers,
        params: {
          page: 0,
          size: 100,
          sort: 'name,ASC'
        },
        timeout: 10000,
      }
    );

    const packages = packagesResponse.data?.data || [];
    console.log('[Functions] Found', packages.length, 'packages at account level');

    if (packages.length === 0) {
      console.log('[Functions] No packages found');
      return res.json({ modules: [] });
    }

    // Step 2: For each package, get its latest revision and check deployments for THIS keyset
    const modulesPromises = packages.map(async (pkg: any) => {
      try {
        // Get latest revision for this package
        const revisionsResponse = await axios.get(
          `${INTERNAL_ADMIN_URL}/api/faas/v1/packages/${pkg.id}/package-revisions`,
          {
            headers,
            params: {
              sort: 'createdDttm,DESC',
              page: 0,
              size: 1  // Get only the latest revision
            },
            timeout: 5000,
          }
        );

        const latestRevision = revisionsResponse.data?.data?.[0];
        if (!latestRevision) {
          console.log(`[Functions] No revisions for package ${pkg.name}`);
          return null;
        }

        // Get deployments for the latest revision
        const deploymentsResponse = await axios.get(
          `${INTERNAL_ADMIN_URL}/api/faas/v1/package-revisions/${latestRevision.id}/package-deployments`,
          {
            headers,
            params: {
              sort: 'createdDttm,DESC',
              page: 0,
              size: 100  // Get all deployments
            },
            timeout: 5000,
          }
        );

        const deployments = deploymentsResponse.data?.data || [];
        console.log(`[Functions] Package ${pkg.name} (${latestRevision.id}): ${deployments.length} total deployments`);

        // Filter to only deployments for THIS keyset and that are RUNNING
        const keysetDeployments = deployments.filter((d: any) => 
          d.keyset?.id === parseInt(keyid) && d.state === 'RUNNING'
        );

        if (keysetDeployments.length === 0) {
          console.log(`[Functions] No RUNNING deployments for package ${pkg.name} on keyset ${keyid}`);
          return null;
        }

        // Take the most recent running deployment (first one since sorted by createdDttm DESC)
        const latestDeployment = keysetDeployments[0];
        const functionDeployments = latestDeployment.functionDeployments || [];
        
        console.log(`[Functions] ✓ Package ${pkg.name} has ${functionDeployments.length} functions running on keyset ${keyid}`);

        return {
          id: pkg.id,
          name: pkg.name,
          revisionId: latestRevision.id,
          revisionName: latestRevision.name,
          deploymentId: latestDeployment.id,
          deploymentState: latestDeployment.state,
          functions: functionDeployments.map((f: any) => ({
            id: f.functionRevisionId,
            name: f.functionName,
            type: f.functionType,
            enabled: f.state === 'RUNNING',
          }))
        };
      } catch (err: any) {
        console.error(`[Functions] Error fetching data for package ${pkg.name}:`, err.message);
        return null;
      }
    });

    const modules = (await Promise.all(modulesPromises)).filter(m => m !== null);

    console.log('[Functions] ✓ Found', modules.length, 'packages with RUNNING deployments on keyset', keyid);

    return res.json({ modules });
  } catch (error: any) {
    // Handle 404 as "no functions configured" not an error
    if (error.response?.status === 404) {
      console.log('[Functions] ✓ 404 response - no functions configured for this keyset');
      return res.json({ modules: [] });
    }

    console.error('[Functions] ✗ Endpoint failed:', error.response?.status || error.message);
    if (error.response?.data) {
      console.error('[Functions] Error details:', error.response.data);
    }

    // Return empty modules array for any error
    res.json({ modules: [] });
  }
});

// Get Events & Actions for a keyset
app.get('/events-actions', async (req, res) => {
  const { keyid, token, accountid, appid, subscribekey } = req.query as { 
    keyid: string; 
    token: string; 
    accountid?: string;
    appid?: string;
    subscribekey?: string;
  };

  if (!keyid || !token) {
    return res.status(400).json({ error: 'Missing keyid or token' });
  }

  if (!subscribekey) {
    console.log(`[Events&Actions] No subscribe key provided for key ${keyid}`);
    return res.json({ listeners: [], actions: [] });
  }

  console.log(`[Events&Actions] Fetching for subscribekey ${subscribekey}, account ${accountid}`);

  // Build headers with delegated account ID for ghosting
  const headers: any = {
    'X-Session-Token': token
  };

  // Add delegated account ID for proper ghosting (required!)
  if (accountid) {
    headers['x-pn-delegated-account-id'] = accountid;
  }

  try {
    // The correct endpoint: /api/keysets/{subscribeKey}/event-listeners
    const endpoint = `${INTERNAL_ADMIN_URL}/api/keysets/${subscribekey}/event-listeners?page=1&limit=100`;
    console.log(`[Events&Actions] GET: ${endpoint}`);
    
    const response = await axios.get(endpoint, {
      headers,
      timeout: 10000,
    });

    const data = response.data;
    console.log(`[Events&Actions] SUCCESS - got ${data.total || 0} event listeners`);

    // Parse the response - data.data contains array of event listeners
    // Each listener has embedded actions array
    const eventListeners = data.data || [];
    
    const listeners: any[] = [];
    const actions: any[] = [];
    const seenActionIds = new Set<string>();

    for (const listener of eventListeners) {
      listeners.push({
        id: listener.id,
        name: listener.name,
        event: listener.category || listener.type || 'message',
        enabled: listener.status === 'on',
      });

      // Extract actions from each listener (they're embedded)
      if (listener.actions && Array.isArray(listener.actions)) {
        for (const action of listener.actions) {
          // Avoid duplicates (same action can be linked to multiple listeners)
          if (!seenActionIds.has(action.id)) {
            seenActionIds.add(action.id);
            actions.push({
              id: action.id,
              name: action.name,
              type: action.category || action.type || 'unknown',
              enabled: action.status === 'on',
            });
          }
        }
      }
    }

    console.log(`[Events&Actions] ✓ Found ${listeners.length} listeners, ${actions.length} unique actions`);
    return res.json({ listeners, actions });
  } catch (error: any) {
    const status = error.response?.status || 'ERR';
    console.log(`[Events&Actions] FAILED ${status}: ${error.message}`);
    return res.json({ listeners: [], actions: [] });
  }
});

// Get usage metrics (using internal admin API)
app.get('/key-usage', async (req, res) => {
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

  try {
    const response = await axios.get(usageUrl, {
      headers: { 'X-Session-Token': token },
    });

    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch usage',
      details: error.response?.data || error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 PubNub Account Usage API running on port ${port}`);
});
