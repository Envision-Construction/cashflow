# Technology Stack

**Analysis Date:** 2026-03-30

## Languages

**Primary:**
- JavaScript (ES6+) - Frontend application logic
- HTML5 - Page markup and structure
- CSS3 - Styling via Tailwind CSS

## Runtime

**Environment:**
- Node.js v25.6.1

**Package Manager:**
- npm v11.9.0
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Express.js ^4.18.2 - Web server for serving static files and fallback routing

**Frontend:**
- Firebase SDK (v9.22.0 CDN) - Firestore database and configuration
- Chart.js - Data visualization and charting
- Tailwind CSS - Utility-first CSS framework (via CDN)
- Lucide Icons - Icon library (via CDN)

**Build/Dev:**
- firebase-tools ^13.0.0 - Firebase CLI for deployment and management

## Key Dependencies

**Critical:**
- `express` ^4.18.2 - HTTP server for serving static frontend and handling fallback routing

**Frontend CDN Imports:**
- `https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js` - Firebase initialization
- `https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js` - Firestore database client
- `https://cdn.tailwindcss.com` - Tailwind CSS styling framework
- `https://cdn.jsdelivr.net/npm/chart.js` - Charting library
- `https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@2.1.0` - Chart annotations plugin
- `https://unpkg.com/lucide@latest` - Icon library
- `https://fonts.googleapis.com/css2?family=Inter` - Inter font family

## Configuration

**Environment:**
- Configuration managed via Firebase Console (project: `cash-flow-app-46893`)
- Firestore database configuration loaded via `getDoc(doc(db, "Configuration", "ProcoreProjects"))`
- Client-side state persisted via `localStorage` for settings like `minCashTarget` and `openingCash`

**Build:**
- `firebase.json` - Defines Firestore rules, indexes, hosting configuration, and storage rules
- `.firebaserc` - Firebase project mapping (`default: cash-flow-app-46893`)
- `firestore.indexes.json` - Firestore index definitions (empty/no custom indexes)
- `firestore.rules` - Firestore security rules (read: public, write: disabled)
- `storage.rules` - Firebase Storage security rules (read/write: authenticated users only)

## Platform Requirements

**Development:**
- Node.js v25.6.1+
- npm v11.9.0+
- Firebase CLI (for deployment via `firebase-tools`)
- Code editor with static file serving capability

**Production:**
- Deployment target: Firebase Hosting (configured via `firebase.json`)
- Backend served via Express.js on configurable port (default: 8080 via `process.env.PORT`)
- Static files served from `.vscode/` directory
- Firestore database (Google Cloud service)
- Firebase Storage (Google Cloud service)

---

*Stack analysis: 2026-03-30*
