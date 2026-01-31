# Create New Netlify Site: pn-tool-usage-history

## Option 1: Via Netlify CLI (Interactive)

Run this command and follow the prompts:

```bash
cd /Users/craig/Documents/gits/pn-account-usage
netlify sites:create --name pn-tool-usage-history
```

When prompted:
- **Team**: Select "PubNub Web Team"
- Site name will be: `pn-tool-usage-history`

Then deploy:
```bash
netlify deploy --prod
```

## Option 2: Via Netlify Dashboard (Easier)

1. Go to https://app.netlify.com
2. Select team: **PubNub Web Team** (top left dropdown)
3. Click **"Add new site"** → **"Deploy manually"**
4. Drag and drop the `dist` folder from this project
5. Once deployed, go to **Site settings** → **Site details**
6. Click **"Change site name"**
7. Enter: `pn-tool-usage-history`
8. Click **Save**

Then set up continuous deployment:
1. Go to **Site settings** → **Build & deploy**
2. Click **"Link repository"**
3. Select **GitHub** → **PubNubDevelopers/pn-tool-usage-history**
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
5. Click **"Deploy site"**

## Option 3: Import from GitHub (Recommended)

1. Go to https://app.netlify.com
2. Select team: **PubNub Web Team**
3. Click **"Add new site"** → **"Import an existing project"**
4. Choose **GitHub**
5. Search for: `PubNubDevelopers/pn-tool-usage-history`
6. Click on the repository
7. Configure:
   - Site name: `pn-tool-usage-history`
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
8. Click **"Deploy pn-tool-usage-history"**

## Your Site URL

Once created, your site will be available at:
**https://pn-tool-usage-history.netlify.app**

## GitHub Repository

The code is already pushed to:
**https://github.com/PubNubDevelopers/pn-tool-usage-history**
