import axios from 'axios';

const INTERNAL_ADMIN_URL = 'https://internal-admin.pubnub.com';

interface FetchAccountDataParams {
  email: string;
  password: string;
}

async function fetchAccountData({ email, password }: FetchAccountDataParams) {
  try {
    console.log(`\n=== Authenticating as ${email} ===\n`);

    // Step 1: Authenticate
    const authResponse = await axios.post(`${INTERNAL_ADMIN_URL}/api/me`, {
      email,
      password,
    });

    const authResult = authResponse.data.result;
    if (!authResult) {
      throw new Error('Authentication failed');
    }

    const token = authResult.token;
    const userId = authResult.user_id;
    const accountId = authResult.user?.account_id;

    console.log(`✓ Authenticated successfully`);
    console.log(`  User ID: ${userId}`);
    console.log(`  Account ID: ${accountId}`);
    console.log(`  Token: ${token.substring(0, 20)}...`);

    // Step 2: Get accounts
    console.log(`\n=== Fetching Accounts ===\n`);
    const accountsResponse = await axios.get(
      `${INTERNAL_ADMIN_URL}/api/accounts?user_id=${userId}`,
      { headers: { 'X-Session-Token': token } }
    );

    const accounts = accountsResponse.data.result || [];
    console.log(`✓ Found ${accounts.length} account(s)`);

    // Step 3: For each account, fetch apps
    for (const account of accounts) {
      console.log(`\n=== Account: ${account.properties?.company || account.email} (ID: ${account.id}) ===`);

      const appsResponse = await axios.get(
        `${INTERNAL_ADMIN_URL}/api/apps?account_id=${account.id}`,
        { headers: { 'X-Session-Token': token } }
      );

      const apps = appsResponse.data.result || [];
      console.log(`  Apps: ${apps.length}`);

      // Step 4: For each app, fetch keysets
      for (const app of apps) {
        console.log(`\n  → App: "${app.name}" (ID: ${app.id})`);
        console.log(`    Created: ${app.created}`);

        const keysetsResponse = await axios.get(
          `${INTERNAL_ADMIN_URL}/api/keys?app_id=${app.id}`,
          { headers: { 'X-Session-Token': token } }
        );

        const keysets = keysetsResponse.data.result || [];
        console.log(`    Keysets: ${keysets.length}`);

        for (const keyset of keysets) {
          const keyName = keyset.properties?.name || 'Unnamed';
          console.log(`\n      → Keyset: "${keyName}" (ID: ${keyset.id})`);
          console.log(`        Created: ${keyset.created}`);
          console.log(`        Subscribe Key: ${keyset.subscribe_key}`);
          console.log(`        Publish Key: ${keyset.publish_key}`);

          // Show feature flags from pnconfig
          if (keyset.pnconfig) {
            console.log(`        Features:`);
            const features = keyset.pnconfig;
            if (features.storage) console.log(`          ✓ Message Persistence`);
            if (features.presence) console.log(`          ✓ Presence`);
            if (features.access_manager) console.log(`          ✓ Access Manager`);
            if (features.apns || features.gcm) console.log(`          ✓ Mobile Push`);
            if (features.objects) console.log(`          ✓ App Context`);
            if (features.files_enabled) console.log(`          ✓ Files`);
            if (features.wildcard_subscribe) console.log(`          ✓ Wildcard Subscribe`);
          }

          // Try to fetch Functions
          try {
            const functionsResponse = await axios.get(
              `${INTERNAL_ADMIN_URL}/api/functions/key/${keyset.id}`,
              {
                headers: { 'X-Session-Token': token },
                timeout: 5000,
              }
            );

            const modules = functionsResponse.data?.modules || [];
            if (modules.length > 0) {
              const totalFunctions = modules.reduce(
                (sum: number, m: any) => sum + (m.functions?.length || 0),
                0
              );
              const runningFunctions = modules.reduce(
                (sum: number, m: any) =>
                  sum + (m.functions?.filter((f: any) => f.enabled).length || 0),
                0
              );
              console.log(`          ✓ Functions: ${modules.length} modules, ${totalFunctions} functions (${runningFunctions} running)`);
            }
          } catch (err) {
            // Functions not configured or error
          }

          // Try to fetch Events & Actions
          try {
            const eventsActionsResponse = await axios.get(
              `${INTERNAL_ADMIN_URL}/api/events-actions/key/${keyset.id}`,
              {
                headers: { 'X-Session-Token': token },
                timeout: 5000,
              }
            );

            const listeners = eventsActionsResponse.data?.listeners || [];
            const actions = eventsActionsResponse.data?.actions || [];
            if (listeners.length > 0 || actions.length > 0) {
              const runningListeners = listeners.filter((l: any) => l.enabled).length;
              const runningActions = actions.filter((a: any) => a.enabled).length;
              console.log(`          ✓ Events & Actions: ${listeners.length} listeners (${runningListeners} active), ${actions.length} actions (${runningActions} active)`);
            }
          } catch (err) {
            // Events & Actions not configured or error
          }
        }
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total accounts: ${accounts.length}`);
    const totalApps = accounts.reduce(
      (sum: number, acc: any) => sum + (acc.apps?.length || 0),
      0
    );
    console.log(`Total apps: ${totalApps}`);

    return { accounts, token };
  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

// Check for command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: npx tsx scripts/fetch-account-data.ts <email> <password>');
  process.exit(1);
}

fetchAccountData({ email, password });
