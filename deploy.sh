#!/bin/bash

echo "🚀 Deploying PubNub Usage History Tool to Netlify"
echo ""
echo "Make sure you're logged in to Netlify:"
echo "  netlify login"
echo ""
echo "This will create a new site under the PubNub Web team"
echo "Site name: pn-tool-usage-history"
echo ""
read -p "Press Enter to continue..."

# Build the project
echo "📦 Building project..."
npm run build

# Initialize if not already done
if [ ! -f ".netlify/state.json" ]; then
    echo "🔗 Initializing Netlify project..."
    netlify init
else
    echo "✅ Project already linked to Netlify"
fi

# Deploy
echo "🚀 Deploying to production..."
netlify deploy --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your site should be available at:"
echo "https://pn-tool-usage-history.netlify.app"
