# Architecture

**Analysis Date:** 2026-03-30

## Pattern Overview

**Overall:** Client-side Single Page Application (SPA) with Firebase backend

**Key Characteristics:**
- Monolithic HTML5 application with embedded JavaScript (no build pipeline)
- Real-time data synchronization with Firestore database
- Google Sheets integration via Apps Script for external data sync
- Responsive UI with Tailwind CSS and Lucide icons
- Weekly cash flow forecasting with multi-module views

## Layers

**Presentation Layer:**
- Purpose: UI rendering and user interaction
- Location: `/.vscode/index.html` (entire application)
- Contains: HTML templates (rendered dynamically), CSS styles (inline Tailwind), event handlers
- Depends on: Chart.js library, Lucide icons library
- Used by: End users via web browser

**Business Logic Layer:**
- Purpose: Data aggregation, calculations, view state management
- Location: `/.vscode/index.html` (lines 59-1110, functions prefixed with `render*`, `process*`, `generate*`)
- Contains: Functions for financial calculations (cash balance projections, summations), data transformations, filtering
- Depends on: Presentation layer for rendering, Data layer for raw data
- Used by: Presentation layer for computed values

**Data Layer:**
- Purpose: Data fetching, storage, synchronization
- Location: `/.vscode/index.html` (lines 28-42, Firebase initialization; lines 59-115, data loading)
- Contains: Firestore connection, in-memory data store (`rawData` array), local storage
- Depends on: Firebase SDK (loaded from CDN)
- Used by: Business logic layer via `getFiltered()` and state variables

**External Integration Layer:**
- Purpose: External API synchronization and persistence
- Location: `/.vscode/index.html` (lines 40, 579-584, async POST to Google Apps Script)
- Contains: Google Sheets sync via Apps Script, adjustment posting to Firestore
- Depends on: GOOGLE_SCRIPT_URL endpoint
- Used by: Business logic when user makes edits

## Data Flow

**Application Initialization:**

1. Browser loads `/.vscode/index.html`
2. Firebase SDK initializes with hardcoded config (`firebaseConfig`)
3. `init()` function executes:
   - Fetches all documents from Firestore `CashFlow` collection
   - Normalizes data types (maps legacy names to canonical types: WIP, Pipeline, ProjectCF, QuickPay, OpBudget, Financing, CreditLines)
   - Expands financing liabilities into weekly payment schedules via `generateLiabilitySchedule()`
   - Expands operating budget templates into weekly entries via `generateOpBudgetSchedule()`
   - Fetches project metadata from `Configuration.ProcoreProjects` (if available)
   - Extracts unique weeks and filters to recent history + future
   - Renders sidebar and layout

**View Rendering Pipeline:**

1. `renderLayout()` determines which view to show based on `currentView`
2. For Dashboard: `renderDashboard()` generates HTML with 20-week cash flow statement
3. For module views (WIP, Pipeline, etc.): `renderModuleView()` generates specialized tables
4. For Pipeline: Groups by project, aggregates monthly, shows 12-month grid with editable cells
5. For Operating Budget: Groups by Control_Type → Expense_Group → Expense_Item hierarchy
6. Chart updates via `renderChart()` for 13-week forward projection

**User Edit Flow:**

1. User modifies Pipeline grid cell or OpBudget entry
2. Change triggers `updatePipelineAmount()` or `saveEntry()`
3. New adjustment record created with `Entry_ID`, `Week_Ending`, delta amount
4. Locally appended to `rawData` and `weeks` arrays
5. Immediately POST to Google Apps Script URL for external logging
6. UI re-renders via `renderLayout()` to show updated totals
7. (Note: Does not persist back to Firestore directly from client - Firestore is read-only)

**State Management:**

- **Global in-memory state:** `rawData` (array of all cash flow records), `projectList` (project metadata), `weeks` (sorted unique week dates), `currentView` (active tab), various UI filters
- **Persistent local state:** `minCashTarget`, `openingCashBalance` (via browser `localStorage`)
- **Transient UI state:** `searchQuery`, `activeOpBudgetFilter`, `pipelineStartMonth`, `includePipeline` toggle

## Key Abstractions

**Data Record:**
- Purpose: Canonical cash flow entry
- Examples: Any record in `rawData` from Firestore `CashFlow` collection
- Pattern: Object with properties like `Week_Ending`, `DataType`, `Project`, `Amount`, `Detail`, `Category`, `Expense_Group`, `Expense_Item`, etc.
- Each data type (WIP, Pipeline, ProjectCF, etc.) uses different subset of properties

**Data Type:**
- Purpose: Categorize cash flow by source/purpose
- Examples: `WIP` (project receipts), `Pipeline` (pursuit opportunities), `ProjectCF` (direct costs), `OpBudget` (operating expenses), `Financing` (debt service)
- Pattern: String constant used as filter key; maps to specific rendering logic and calculation rules

**Template Expansion:**
- Purpose: Convert frequency-based templates into actual dated entries
- Examples: `generateOpBudgetSchedule()`, `generateLiabilitySchedule()`
- Pattern: Takes a template item with `Frequency` and `Due_Date`/`First_Payment`, calculates all occurrences within date range, outputs array of dated records

**View Module:**
- Purpose: Encapsulate rendering logic for each sidebar tab
- Examples: Dashboard, WIP Forecast, Pipeline Forecast, Operating Budget, etc.
- Pattern: `renderModuleView(type)` routes to specialized rendering based on data type; each module has its own grouping, filtering, and table structure

**Project Metadata:**
- Purpose: Enrich pipeline projects with source, stage, project number, terms
- Examples: `projectList[projectName]` contains `{ name, Source, Stage, Project_Number, Terms }`
- Pattern: Stored in Firestore `Configuration.ProcoreProjects`, synchronized on load, updated locally when user edits pipeline cells

## Entry Points

**Application Entry:**
- Location: `/.vscode/index.html` (line 1428, `window.onload = init`)
- Triggers: Browser page load
- Responsibilities: Fetch data, normalize types, expand templates, render UI

**View Navigation:**
- Location: `window.setView()` (line 1240)
- Triggers: User clicks sidebar button
- Responsibilities: Switch `currentView`, reset filters, call `renderLayout()`

**Data Modification:**
- Location: `window.saveEntry()` (line 1314, async), `window.updatePipelineAmount()` (line 545, async)
- Triggers: User submits form or edits grid cell
- Responsibilities: Create adjustment record, POST to Google Apps Script, update `rawData`, re-render

**Chart Rendering:**
- Location: `window.renderChart()` (line 1132)
- Triggers: After `renderLayout()` when Dashboard view is active
- Responsibilities: Create Chart.js instance with 13-week forward projection

## Error Handling

**Strategy:** Try-catch with console logging and user alerts

**Patterns:**
- `init()` wraps all data loading in try-catch, logs errors to console, shows alert if load fails
- Firebase read failures logged but degrade gracefully (empty data)
- Google Apps Script POST failures caught, alert shown but local state persists
- Invalid user input (parsing, validation) handled with alerts and re-prompts

## Cross-Cutting Concerns

**Logging:**
- `console.log()` and `console.warn()` for errors and missing data (e.g., missing ProcoreProjects config)
- No structured logging or external service

**Validation:**
- Date parsing validates ISO format and uses `isNaN()` checks
- Number parsing uses `parseFloat()` and checks validity
- User prompts validated before applying (e.g., cash target entry)

**Authentication:**
- None - Firestore rules allow all reads (`allow read: if true`), deny all writes
- Write operations bypass Firestore, instead POST to external Google Apps Script endpoint
- No user session or identity management

---

*Architecture analysis: 2026-03-30*
