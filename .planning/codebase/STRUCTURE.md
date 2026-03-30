# Codebase Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
cashflow/
├── .vscode/                    # Application directory (served by Express)
│   ├── index.html              # Complete SPA application (1590 lines)
│   └── settings.json           # VSCode Python environment config
├── node_modules/               # Dependencies (Express, Firebase Tools)
├── .git/                        # Git repository
├── .omc/                        # OMC orchestration state
├── .planning/                   # Planning and analysis documents
│   └── codebase/               # Codebase mapping documents
├── server.js                    # Express server entry point
├── package.json                 # Node dependencies
├── package-lock.json            # Dependency lock
├── firebase.json                # Firebase hosting config
├── .firebaserc                  # Firebase project ID
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Firestore index definitions
├── storage.rules                # Cloud Storage rules
├── README.md                    # Project readme
└── .gitignore                   # Git ignore rules
```

## Directory Purposes

**`.vscode/`:**
- Purpose: Frontend application directory (web UI)
- Contains: Single HTML file with complete SPA application
- Key files: `index.html` (entire application logic)
- Served by: Express static middleware as public directory

**`node_modules/`:**
- Purpose: NPM package dependencies
- Contains: express, firebase-tools, transitive dependencies
- Generated: Yes (by npm install)
- Committed: No

**`.planning/codebase/`:**
- Purpose: Architecture and structure documentation for this codebase
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md
- Auto-generated: Yes (by GSD codebase mapper)

## Key File Locations

**Entry Points:**
- `server.js`: Node.js Express server (production entry point)
- `/.vscode/index.html` (line 1428): Browser SPA initialization via `window.onload = init`
- `/.vscode/index.html` (line 59-114): `init()` async function - loads Firestore data

**Configuration:**
- `firebase.json`: Firebase hosting and Firestore rules configuration
- `.firebaserc`: Firebase project ID and project mapping
- `firestore.rules`: Firestore security rules (read-only for clients)
- `firestore.indexes.json`: Firestore composite indexes
- `storage.rules`: Cloud Storage access rules
- `package.json`: Node dependencies (Express, Firebase Tools)
- `/.vscode/settings.json`: VSCode Python environment settings

**Core Logic:**
- `/.vscode/index.html`: All application logic (JavaScript, HTML, inline CSS)
  - Lines 1-26: HTML head with external script/library imports
  - Lines 27-43: Firebase SDK import and initialization
  - Lines 45-56: Global state variables
  - Lines 59-114: `init()` function - data loading and app initialization
  - Lines 116-314: Helper functions and data transformation (formatting, filtering, schedule generation)
  - Lines 316-482: UI rendering core (sidebar, layout, dashboard)
  - Lines 486-590: Dashboard and pipeline grid logic
  - Lines 592-1110: Module-specific view rendering (WIP, Pipeline, ProjectCF, etc.)
  - Lines 1113-1428: UI interactions, charts, modals, and entry points

**Testing:**
- None detected (test script in package.json is placeholder)

## Naming Conventions

**Files:**
- Lowercase with no spaces: `index.html`, `server.js`, `package.json`
- Configuration files follow Firebase/Node conventions: `firebase.json`, `.firebaserc`, `firestore.rules`

**Directories:**
- Lowercase: `.vscode`, `.planning`, `node_modules`
- Dot-prefix for hidden/special: `.git`, `.omc`, `.planning`, `.firebaserc`, `.gitignore`

**Functions (JavaScript):**
- camelCase with descriptive verbs: `renderDashboard()`, `processFinancingData()`, `generateLiabilitySchedule()`, `getFiltered()`, `sum()`
- Render functions prefixed with `render*`: `renderSidebar()`, `renderLayout()`, `renderModuleView()`, `renderRow()`, `renderChart()`
- Process/transform functions prefixed with `process*` or `generate*`: `processFinancingData()`, `processOpBudgetData()`, `generateOpBudgetSchedule()`, `generateLiabilitySchedule()`
- Window-exposed functions (public API): `window.setView()`, `window.handleSearch()`, `window.filterOpBudget()`, `window.updatePipelineMeta()`, `window.saveEntry()`

**Variables:**
- camelCase for local variables: `rawData`, `projectList`, `weeks`, `currentView`, `minCashTarget`, `openingCashBalance`
- UPPERCASE for constants: None explicitly used (consider adding for magic numbers)
- State variables prefixed descriptively: `current*` for UI state (`currentView`), `include*` for toggles (`includePipeline`)

**CSS Classes:**
- Tailwind utility classes exclusively used (no custom CSS class names)
- Inline style blocks for animations and special cases

**HTML Elements:**
- camelCase for IDs: `main-content`, `view-container`, `sidebar-nav`, `entry-modal`, `cashFlowChart`
- data-* attributes for metadata: `data-sticky-idx`, `data-original`

## Where to Add New Code

**New Feature (View Module):**
- Primary code: Add new `if (type === 'New Module Name')` branch in `renderModuleView()` function (`/.vscode/index.html` lines 592+)
- Data handler: Add corresponding data type to type mapping on line 593
- Data transformation: If template expansion needed, add `processNewModuleData()` function in init or data processing section (lines 122-177)
- State management: Add new toggle/filter variables at top with other state (lines 45-56)
- Sidebar navigation: Add new menu item to `items` array in `renderSidebar()` (line 317)

**New Data Transformation:**
- Template expansion: Add new generator function like `generateNewSchedule()` (follow pattern of `generateOpBudgetSchedule()` at lines 179-255)
- Data normalization: Add new type mapping in `processFinancingData()` or create new `processNewData()` function called from `init()`

**New UI Component:**
- Modal forms: Add new HTML in `openModal()` section (lines 1247-1264)
- Summary cards/KPIs: Add to relevant module's `return` HTML template
- Data tables: Use pattern from existing tables with sticky headers (line 385-406)

**New Helper Function:**
- Calculations/utilities: Add to "HELPERS" section (lines 116-314)
- Formatting: Extend or enhance `fmt()` and `fmtCompact()` functions (line 118-119)
- Filtering/aggregation: Extend `getFiltered()` and `sum()` (line 117, 120)

**New Integration:**
- External API calls: Follow pattern in `updatePipelineAmount()` (lines 545-589) with async/await and fetch POST
- Data sync: Add endpoint configuration near top (see `GOOGLE_SCRIPT_URL` on line 40)
- Error handling: Wrap in try-catch with console.error and user alert

## Special Directories

**`.planning/codebase/`:**
- Purpose: Auto-generated architecture and structure documentation
- Generated: Yes (by GSD codebase mapper)
- Committed: Yes (tracking analysis over time)
- Do not manually edit - regenerate with `/gsd:map-codebase arch`

**`.omc/`:**
- Purpose: Oh-My-Claude orchestration state and memory
- Generated: Yes (by OMC infrastructure)
- Committed: Yes (preserves session state)
- Do not manually edit

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (by npm install)
- Committed: No (.gitignore prevents it)

## Architecture Decisions

**Single File Application:**
- All logic in `/.vscode/index.html` (no build pipeline, no bundling required)
- Rationale: Simple deployment to Firebase Hosting, CDN dependencies, rapid iteration
- Tradeoff: File size (1590 lines), readability, modularity

**Firebase Firestore Read-Only:**
- Client receives data read-only from Firestore (`allow write: if false`)
- Write operations bypass Firestore, POST to Google Apps Script instead
- Rationale: Centralized data governance via Sheets, prevents client-side data corruption, external systems remain source of truth

**No Backend Server Logic:**
- Express server only serves static files from `/.vscode/`
- All business logic runs in browser
- Rationale: Reduces infrastructure, cost, deployment complexity; suitable for financial forecasting (non-real-time, single-user)

**Template Expansion on Load:**
- OpBudget and Financing templates expanded into dated entries during `init()`
- Rationale: Avoid repeated calculations, simplify view rendering, consistent week-based grouping

---

*Structure analysis: 2026-03-30*
