# PubNub Internal Admin Framework

> **⚠️ INTERNAL USE ONLY - NOT FOR PUBLIC DEPLOYMENT ⚠️**

## 🚨 CRITICAL SECURITY NOTICES

### Deployment Restrictions

THIS APPLICATION CANNOT BE DEPLOYED TO PUBLIC SERVERS. The backend requires direct access to `internal-admin.pubnub.com` which is **ONLY accessible within the PubNub VPN**.

**❌ PROHIBITED DEPLOYMENTS:**
- Netlify, Vercel, Railway, Heroku, or any public cloud hosting
- AWS, Azure, GCP, or Digital Ocean without proper VPN tunnel configuration
- Any environment accessible from the public internet
- Personal servers or home networks

**✅ APPROVED DEPLOYMENT OPTIONS:**
1. Local development servers (recommended for development)
2. Docker containers distributed internally within PubNub VPN
3. Internal PubNub infrastructure with VPN access

### Authentication Security

This tool uses PubNub internal admin credentials. You MUST:
- Never commit credentials to the repository
- Never deploy to public infrastructure
- Follow formal internal procedures for credential access
- Use proper VPN connection before running

---

## Overview

The **PubNub Internal Admin Framework** is a **template/framework for building internal PubNub admin tools** that require VPN access to `internal-admin.pubnub.com`.

### What It Provides

This framework provides a pre-built foundation for creating internal applications that need:

- **Internal admin authentication** with session token management
- **Customer account data retrieval** (account "ghosting" with delegated headers)
- **Account properties viewing** including apps and keysets configuration
- **Usage data analytics** with interactive charts and tables
- **Integration with PubNub MCP Server** and direct REST API calls for features not yet in MCP (Functions v2, Illuminate/Events & Actions)

### Current Implementation

Out of the box, this framework is configured as an **account usage analytics dashboard**, but it can be customized for other internal admin use cases. Developers can fork/clone this framework to build new internal tools that need similar admin access patterns.

### Key Capabilities

- Email/password authentication with PubNub admin portal
- Account search by email or direct ID entry
- Hierarchical data selection (Account → App → Keyset)
- Date range picker for usage data (up to 12 months)
- Interactive charts and metrics tables
- CSV export functionality
- Real-time Features page (Functions, Events & Actions, App Context)

---

## Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **TanStack Table** - Advanced data grids
- **React Router** - Client-side routing

### Backend Stack
- **Express.js** with TypeScript
- **Port 5050** - API server
- **CORS enabled** for localhost development

### External Dependencies
- **`internal-admin.pubnub.com`** - PubNub internal admin API (VPN REQUIRED)
- **Session token authentication** with X-Session-Token headers
- **Account ghosting** via `x-pn-delegated-account-id` header for customer impersonation

---

## Prerequisites

### Required
- **Node.js 18 or higher**
- **npm** or **yarn** package manager
- **Active PubNub VPN connection** (MANDATORY)
- Internal admin credentials (follow internal procedures to obtain)

### VPN Setup

**YOU MUST BE CONNECTED TO THE PUBNUB VPN BEFORE RUNNING THIS APPLICATION.**

1. Connect to PubNub VPN using your assigned credentials
2. Verify connectivity:
   ```bash
   curl https://internal-admin.pubnub.com
   ```
3. Expected response: `401 Unauthorized` (means VPN is working)
4. If you get "Connection refused" or timeout: **VPN is not connected - DO NOT PROCEED**

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd pn-internal-admin-framework
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

### 3. Environment Configuration (Optional)

The application works without environment variables for local development. The backend defaults to:
- Port: `5050`
- Target: `https://internal-admin.pubnub.com`

To customize, create a `.env` file in the `server/` directory:
```bash
PORT=5050
INTERNAL_ADMIN_URL=https://internal-admin.pubnub.com
```

### 4. Run the Application

**Option A: Run both servers concurrently (recommended)**
```bash
npm start
```

**Option B: Run servers separately**
```bash
# Terminal 1: Backend server
npm run server

# Terminal 2: Frontend dev server
npm run dev
```

Access the application at: **http://localhost:3000**

---

## Docker Deployment (Internal Only)

For distributing to team members within the PubNub VPN:

### Building Docker Image

```bash
docker build -t pn-internal-admin:latest .
```

### Running Container

```bash
docker run -p 3000:3000 -p 5050:5050 pn-internal-admin:latest
```

**⚠️ IMPORTANT:** Docker containers must run on machines with VPN access. The container itself cannot establish VPN connections.

---

## Usage

### 1. Authentication

- Navigate to http://localhost:3000
- Enter your PubNub admin email and password
- Click "Sign In"

### 2. Account Selection

**Option A: Direct Account ID Entry**
- Enter the customer's account ID in the sidebar
- Account IDs can be found at internal-admin.pubnub.com

**Option B: Email Search**
- Click "Search by Email" in the sidebar
- Enter customer email address
- Select account from search results

### 3. Navigation

- **Account Level**: View all apps and aggregate usage across the account
- **App Level**: Select an app to view its keysets and app-specific usage
- **Keyset Level**: Select a keyset to view detailed usage and configured features

### 4. Date Range Selection

- Use date pickers for custom ranges (up to 12 months)
- Quick buttons: **7D**, **30D**, **90D**, **1Y**

### 5. Pages

- **Usage Summary**: Transaction metrics, charts, trends, and export functionality
- **Features**: View configured features per keyset (Functions, Events & Actions, App Context, etc.)

---

## Project Structure

```
pn-internal-admin-framework/
├── server/                      # Express backend (TypeScript)
│   ├── index.ts                # Main server file with proxy routes
│   └── package.json            # Server dependencies
├── src/                         # React frontend
│   ├── components/             # UI components
│   │   ├── layout/             # Layout components (Header, Sidebar, SelectionPanel)
│   │   └── features/           # Feature-specific components
│   ├── context/                # React context providers
│   │   └── AuthContext.tsx     # Authentication and global state management
│   ├── hooks/                  # Custom React hooks
│   ├── pages/                  # Page components
│   │   ├── Login.tsx           # Authentication page
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   ├── UsageSummary.tsx    # Usage metrics page
│   │   └── Features.tsx        # Features configuration page
│   ├── services/               # API clients and utilities
│   │   ├── api.ts              # API service layer
│   │   ├── cacheManager.ts     # Usage data caching
│   │   ├── smartFetcher.ts     # Intelligent data fetching
│   │   └── screenStateManager.ts # Screen state persistence
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Utility functions
├── package.json                # Frontend dependencies and scripts
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

---

## Backend API Endpoints

All endpoints proxy requests to `internal-admin.pubnub.com`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/login` | GET | Authenticate with admin credentials and retrieve accounts |
| `/search-accounts` | GET | Search for customer accounts by email |
| `/apps` | GET | Retrieve apps for an account (with account ghosting) |
| `/keys` | GET | Retrieve keysets for an app |
| `/keyset-details` | GET | Get detailed keyset configuration |
| `/functions` | GET | Retrieve Functions v2 data (FaaS API) |
| `/events-actions` | GET | Retrieve Events & Actions configuration |
| `/key-usage` | GET | Fetch usage metrics (legacy transaction API) |

---

## Security Considerations

### Credential Management
- **Session tokens stored in memory only** (not localStorage or cookies)
- Credentials never exposed to browser (proxied through backend)
- No token persistence across browser sessions
- Automatic logout on session expiration

### Account Ghosting
The application uses "ghosting" to impersonate customer accounts:
- Requires `x-pn-delegated-account-id` header for API calls
- Only works with valid admin session token
- Used for viewing customer configurations without their login credentials
- **Use responsibly** - you're accessing production customer data

### VPN Requirement
- All backend requests target `internal-admin.pubnub.com`
- This domain is NOT accessible from public internet
- VPN connection enforces access control
- Applications will fail if VPN is not connected

### Network Security
- Backend CORS configured for `localhost` development only (origin: '*' for dev)
- No HTTPS termination (assumes VPN provides secure tunnel)
- Session tokens transmitted in headers (not query params)

---

## Troubleshooting

### "Failed to fetch" or Network Errors

**Cause:** VPN not connected or `internal-admin.pubnub.com` unreachable

**Solution:**
1. Verify VPN connection is active
2. Test connectivity: `curl https://internal-admin.pubnub.com`
3. If test fails, reconnect to VPN
4. Restart the application after VPN is connected

### "Authentication failed"

**Cause:** Invalid credentials or expired session token

**Solution:**
1. Verify your admin credentials are correct
2. Logout and login again to refresh session token
3. Check with your team lead if credentials need to be reset
4. Ensure you have proper admin permissions

### "No data returned" for customer account

**Cause:** Account has no usage data in the selected date range

**Solution:**
1. Expand the date range (e.g., try 90 days instead of 7 days)
2. Verify the account ID is correct
3. Check if the account is active and has traffic
4. Try selecting a specific app or keyset instead of "All"

### Port Already in Use

**Cause:** Another process is using port 3000 or 5050

**Solution:**
```bash
# Find and kill process on port 5050
lsof -ti:5050 | xargs kill -9

# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change ports in server/index.ts or vite.config.ts
```

---

## Using This as a Template

### Purpose

This framework can be forked or cloned to build **new internal PubNub admin tools** that require similar access patterns to `internal-admin.pubnub.com`.

### What's Included

Pre-built components and patterns for:
- ✅ Internal admin authentication flow
- ✅ Account ghosting (impersonation) with delegated headers
- ✅ Session token management and storage
- ✅ API proxy patterns for internal-admin endpoints
- ✅ Date range selection with caching
- ✅ Hierarchical data selection (Account → App → Keyset)
- ✅ Responsive UI with Tailwind CSS
- ✅ Type-safe TypeScript throughout

### Customization Guide

#### 1. Modify UI Components
- Update pages in `src/pages/` to match your tool's purpose
- Customize components in `src/components/` for your use case
- Update branding, labels, and text throughout the UI

#### 2. Add New API Endpoints
- Add new proxy routes in `server/index.ts`
- Follow existing patterns for session tokens and ghosting headers
- Reference internal-admin.pubnub.com API documentation for available endpoints

#### 3. Leverage Existing Services
- **`src/services/api.ts`** - API client with authentication
- **`src/services/cacheManager.ts`** - Smart caching for usage data
- **`src/services/smartFetcher.ts`** - Intelligent data fetching with retry logic
- **`src/services/screenStateManager.ts`** - Persist UI state across sessions

#### 4. Update Branding
- Change application title in `index.html`
- Update header/sidebar labels in `src/components/layout/`
- Modify login page heading in `src/pages/Login.tsx`

### Key Patterns to Reuse

1. **Session Token Authentication Flow** (`src/context/AuthContext.tsx`)
   - Login/logout handling
   - Token storage in memory
   - Session persistence detection

2. **Account Ghosting** (Throughout API calls)
   - Use `x-pn-delegated-account-id` header
   - Always include with session token
   - Enables customer account impersonation

3. **Date Range Selection** (`src/components/layout/DateRangeSelector.tsx`)
   - Smart caching to avoid redundant API calls
   - Quick buttons for common ranges
   - Validation for maximum range limits

4. **Hierarchical Data Selection** (`src/components/layout/SelectionPanel.tsx`)
   - Account → App → Keyset drill-down
   - "All" options for aggregated views
   - State management in AuthContext

---

## Development

### Available Scripts

**Frontend (root directory):**
- `npm run dev` - Start Vite dev server (port 3000)
- `npm run build` - Build production bundle to `/dist`
- `npm run preview` - Preview production build locally

**Backend (server directory):**
- `npm run start` - Run server with tsx (production mode)
- `npm run dev` - Run server with watch mode (development)

**Combined:**
- `npm start` - Run both frontend and backend concurrently (recommended)

### Adding New Features

1. **Frontend changes**: Add components/pages in `src/`
2. **Backend routes**: Add proxy endpoints in `server/index.ts`
3. **Follow existing patterns** for authentication and ghosting
4. **Test with real customer data** on VPN (in development/staging environments)

### Code Style

- **TypeScript strict mode** enabled
- Follow existing component patterns (functional components with hooks)
- Use **Tailwind CSS utilities** for styling (no custom CSS unless necessary)
- Maintain type safety - avoid `any` types where possible

---

## Maintenance Notes

### Known Issues
- No automated tests (manual testing required)
- Usage data API has rate limits (caching helps mitigate)
- Functions v2 API can be slow for accounts with many packages

### Future Improvements
- Add end-to-end tests with Playwright or Cypress
- Implement proper error boundary components
- Add loading skeletons for better UX
- Create reusable chart components library
- Add data export to multiple formats (Excel, JSON)

---

## License and Support

**Internal PubNub tool** - proprietary and confidential.
**Not licensed for external use or distribution.**

### Support

For issues or questions:
1. Check internal documentation and wiki
2. Contact DevOps or Platform team via Slack
3. Email: support@pubnub.com (for internal escalation)

---

**Built with ❤️ by the PubNub team for the PubNub team**
