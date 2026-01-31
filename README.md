# PubNub Account Usage Dashboard

Internal admin tool for viewing PubNub customer account usage metrics.

## Features

- **Email/Password Authentication** - Sign in with PubNub admin credentials
- **Manual Account ID Entry** - Enter any customer account ID to view their data
- **Hierarchical Selection** - Drill down from Account → App → Keyset
- **Date Range Picker** - View data for any period up to 12 months
- **Interactive Charts** - Transaction trends, API breakdown, type distribution
- **Detailed Metrics Table** - Searchable, sortable, with CSV export

## Getting Started

### Prerequisites

- Node.js 18+
- Access to PubNub admin portal (VPN may be required)

### Installation

```bash
# Install frontend dependencies
npm install

# Install server dependencies  
cd server && npm install && cd ..
```

### Running the App

```bash
# Start both frontend and backend
npm start
```

Or run them separately:

```bash
# Terminal 1: Start backend server (port 5000)
npm run server

# Terminal 2: Start frontend dev server (port 3000)
npm run dev
```

Then open http://localhost:3000

## Usage

1. **Login** with your PubNub admin email and password
2. **Enter Account ID** in the sidebar (look it up at internal-admin.pubnub.com)
3. **Select an App** (or "All Applications")
4. **Select a Keyset** (or "All Key Sets")
5. **Choose a date range** using the date pickers or quick buttons (7D, 30D, 90D, 1Y)
6. **View the data** in charts and tables

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Charts**: Recharts
- **Tables**: TanStack Table
- **Backend**: Express + TypeScript
- **API**: admin.pubnub.com (session token auth)

## Project Structure

```
pn-account-usage/
├── server/              # Express backend
│   └── index.ts         # API proxy routes
├── src/                 # React frontend
│   ├── components/      # UI components
│   ├── context/         # Auth context
│   ├── pages/           # Login & Dashboard
│   ├── services/        # API client
│   ├── types/           # TypeScript types
│   └── utils/           # Metrics processing
└── package.json
```

## Security Notes

- Session tokens are stored in memory only (not persisted)
- Credentials are proxied through the backend (never exposed to browser)
- Requires VPN access for internal admin endpoints
