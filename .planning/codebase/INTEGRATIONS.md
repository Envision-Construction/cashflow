# External Integrations

**Analysis Date:** 2026-03-30

## APIs & External Services

**Google Sheets API:**
- Service: Google Apps Script webhook for data sync and updates
- What it's used for: Persisting cash flow data, operating budget entries, and financing liabilities
  - Endpoint: `https://script.google.com/macros/s/AKfycbyvPFMTM_5M2ahhS29Jf8lKZD5Xk6VJ_fv7ihzdKpYnoYfeVJG-qzPEmY6lmoygClfP/exec`
  - Method: POST with JSON payload
  - Auth: Webhook URL in frontend (`GOOGLE_SCRIPT_URL`)
  - Used for: New cash flow entries, updates to operating budget, financing liability records

**Procore API (Optional/Conditional):**
- Service: Construction project management system
- What it's used for: Fetching project list and details for cash flow forecasting
  - Data source: `Configuration/ProcoreProjects` Firestore document
  - Method: Read from Firestore config, projects listed with `source: 'Procore'` field
  - Auth: Configured via BigQuery/Mock Sync (implementation details in Firestore)
  - Status: Optional - app runs in "Local Mode" if Procore config not found
  - Used for: Project source selection, project details in dashboard views

## Data Storage

**Databases:**
- Firebase Firestore (Google Cloud)
  - Project ID: `cash-flow-app-46893`
  - Connection: Initialized via `initializeApp(firebaseConfig)` with hardcoded apiKey
  - Client: Firebase SDK (v9.22.0)
  - Collections:
    - `CashFlow` - Main cash flow data records (contains DataType field for categorization)
    - `Configuration/ProcoreProjects` - Procore project list and configuration
  - Rules: Read-only for public access, writes disabled via Firestore rules

**File Storage:**
- Firebase Storage (Google Cloud)
  - Bucket: `cash-flow-app-46893.firebasestorage.app`
  - Rules: Authenticated users only (read/write)
  - Purpose: Storing uploaded files and attachments (if used)

**Client-side Storage:**
- Browser `localStorage` - Persists user preferences:
  - `minCashTarget` - Minimum cash target setting
  - `openingCash` - Opening cash balance setting

**Caching:**
- None detected - Real-time data fetch from Firestore on initialization

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication (implicit/optional)
  - Implementation: Storage rules check `request.auth != null`, but app-level auth not enforced in Firestore rules
  - Session: Browser-based via Firebase SDK
  - Public read access enabled via Firestore rules (`allow read: if true`)

**API Authentication:**
- Firebase Config (hardcoded in frontend):
  - apiKey: `AIzaSyCTL6KFc45icS6fuZiQ9XpBpHU8SJbKtOo`
  - authDomain: `cash-flow-app-46893.firebaseapp.com`
  - projectId: `cash-flow-app-46893`
  - storageBucket: `cash-flow-app-46893.firebasestorage.app`
  - messagingSenderId: `941640320942`
  - appId: `1:941640320942:web:740e0f2560bbf0d8dfaa3f`

- Google Sheets Integration: Webhook uses POST method with JSON, no explicit API key in frontend (handled by Google Apps Script)

## Monitoring & Observability

**Error Tracking:**
- None detected - Browser console warnings used (`console.warn()`)

**Logs:**
- Browser console logging
- Example: "ProcoreProjects config not found, skipping."
- No server-side logging infrastructure detected

## CI/CD & Deployment

**Hosting:**
- Firebase Hosting (configured via `firebase.json`)
  - Public directory: `.vscode/`
  - Ignored paths: Firebase config files, node_modules, .json files
  - Fallback routing: All requests serve `index.html` (SPA pattern)

**Server:**
- Express.js application (`server.js`)
  - Port: Configurable via `process.env.PORT` (default: 8080)
  - Static file serving: `.vscode/` directory
  - Route: Wildcard fallback (`app.get('*', ...)`) for SPA routing

**CI Pipeline:**
- None detected - Manual deployment via `firebase-tools`
- Deploy command: `npm start` (runs `node server.js`) for local development
- Firebase deploy: `firebase deploy` (managed by firebase-tools)

## Environment Configuration

**Required env vars:**
- `PORT` - Server port (optional, defaults to 8080)

**Secrets location:**
- Firebase config is hardcoded in frontend (`.vscode/index.html`) - Not recommended for production
- Google Sheets webhook URL is hardcoded in frontend
- `.gitignore` excludes:
  - `*.key`, `*.secret` - Local credential files
  - `.env` - Environment file (if created)
  - `.firebase/` - Firebase cache directory
  - `.vscode/cash-flow-app-46893-firebase-adminsdk-fbsvc-*.json` - Firebase service account key

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- Google Sheets API calls via webhook POST:
  - Triggered on: New cash flow entry, operating budget update, financing liability record
  - Payload: JSON object with entry details (Week_Ending, Amount, Description, etc.)
  - Response: Webhook confirms receipt and updates Google Sheet

## Data Flow

**Cash Flow Initialization:**
1. Frontend loads, initializes Firebase app
2. Fetches all documents from `CashFlow` collection
3. Normalizes DataType field (e.g., "WIP Forecast" → "WIP")
4. Processes Financing and Operating Budget data
5. Attempts to fetch Procore project list from `Configuration/ProcoreProjects`
6. Falls back to "Local Mode" if Procore config missing

**Cash Flow Updates:**
1. User submits new entry via form
2. POST to Google Sheets webhook with JSON payload
3. Webhook updates Google Sheet and returns success
4. Frontend updates local state and re-renders UI

---

*Integration audit: 2026-03-30*
