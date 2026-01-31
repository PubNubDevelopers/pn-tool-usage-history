# Deployment Guide - PubNub Usage History Tool

## Quick Deploy to Netlify

### Option 1: Netlify CLI (Recommended)

1. **Make sure you're logged in to Netlify CLI:**
   ```bash
   netlify login
   ```

2. **Initialize the project (from project root):**
   ```bash
   netlify init
   ```
   
   When prompted:
   - Choose: "Yes, create and deploy project manually"
   - Team: Select **pubnub-web**
   - Site name: Enter **pn-tool-usage-history**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

3. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

### Option 2: Netlify Dashboard

1. **Push to GitHub:**
   ```bash
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import to Netlify:**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect to your GitHub repository
   - Select team: **pubnub-web**
   - Configure build settings:
     - Site name: `pn-tool-usage-history`
     - Build command: `npm run build`
     - Publish directory: `dist`
     - Functions directory: `netlify/functions`

3. **Deploy!**

## What's Been Set Up

✅ **Frontend:** React + TypeScript + Vite  
✅ **Backend:** Converted to Netlify Functions (serverless)  
✅ **Configuration:** `netlify.toml` with proper routing  
✅ **Git:** Repository initialized with all files committed

## Netlify Functions

The Express backend has been converted to 5 serverless functions:

- `/api/login` - Authentication
- `/api/search-accounts` - Account search by email  
- `/api/apps` - Fetch apps for an account
- `/api/keys` - Fetch keys for an app
- `/api/key-usage` - Fetch usage metrics

All API calls are automatically routed to these functions via the redirects in `netlify.toml`.

## Post-Deployment

After deployment, the app will be available at:
```
https://pn-tool-usage-history.netlify.app
```

Or if deployed under the PubNub team:
```
https://pn-tool-usage-history--pubnub-web.netlify.app
```

## Local Development

To test the Netlify Functions locally:

```bash
netlify dev
```

This will:
- Start the Vite dev server
- Run Netlify Functions locally
- Proxy `/api/*` requests to the functions

## Notes

- The app uses PubNub Internal Admin API (`internal-admin.pubnub.com`)
- Authentication is email/password based
- All data fetching happens through serverless functions (no separate backend server needed)
- Functions automatically scale with usage
