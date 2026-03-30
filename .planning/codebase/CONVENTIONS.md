# Coding Conventions

**Analysis Date:** 2026-03-30

## Naming Patterns

**Files:**
- HTML files: lowercase with hyphens (`index.html`)
- Single entry point: `/Users/avireddy/GitHub/cashflow/.vscode/index.html`

**Functions:**
- camelCase for regular functions: `getFiltered()`, `renderDashboard()`, `processFinancingData()`
- Functions exposed to window API use camelCase: `window.setView()`, `window.handleSearch()`, `window.editTarget()`
- Descriptive names following action-subject pattern: `renderSidebar()`, `generateLiabilitySchedule()`, `updateStickyOffsets()`

**Variables:**
- camelCase for all variables: `currentView`, `includePipeline`, `minCashTarget`, `rawData`, `projectList`, `searchQuery`
- Constants (uppercase): Not consistently applied; magic values stored as-is in code
- State variables declared with `let` at module scope: `let rawData = []`, `let projectList = {}`
- Local constants with `const`: `const getFiltered = (type) => rawData.filter(...)`, `const fmt = (num) => ...`

**HTML Input Elements:**
- Prefixed with `in_` for standard form fields: `in_date`, `in_amt`, `in_proj`, `in_cat`, `in_det`
- Prefixed with `op_` for operating budget fields: `op_control`, `op_type`, `op_group`, `op_item`, `op_vendor`, `op_amount`
- HTML IDs follow kebab-case for containers: `main-content`, `entry-modal`, `sidebar-nav`, `view-container`

## Code Style

**Formatting:**
- No linting or formatting tools configured (no `.eslintrc`, `.prettierrc`, or similar)
- Inline CSS in HTML `<style>` blocks with Tailwind classes in markup
- Consistent 4-space indentation in JavaScript code
- No automatic formatting applied

**Linting:**
- No linter configured
- Code written with implicit style conventions
- Firebase and Chart.js as external dependencies

**Comments:**
- Limited comments throughout codebase
- Comments focus on section headers: `// --- CONFIGURATION ---`, `// --- STATE ---`, `// --- INIT ---`
- Descriptive function and variable names reduce need for inline comments

## Import Organization

**Module Pattern:**
- Single-file application: All code in `/Users/avireddy/GitHub/cashflow/.vscode/index.html`
- ES6 module imports via CDN:
  ```javascript
  import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
  import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
  ```
- External libraries loaded via `<script>` tags (Tailwind, Chart.js, Lucide icons)

**Path Aliases:**
- No path aliases used; all code in single file

**Global State Management:**
- Module-level `let` variables for application state
- No formal state management library (no Redux, Zustand, etc.)
- State modified directly in handlers: `currentView = v`, `includePipeline = c`, `rawData.push(...)`

## Error Handling

**Pattern:**
- Try-catch blocks used selectively for critical operations
- Examples of try-catch usage:
  - Data loading in `init()` function (lines 60-114)
  - Procore project fetch with graceful fallback (lines 98-105)
  - Google Script URL POST requests (lines 572-588)
  - Firebase operations in `saveEntry()` (lines 1297-1310)

**Error Messages:**
- User-facing: `alert()` dialogs for errors: `alert("Data Load Error. Check console.")`
- Developer-facing: `console.error()` and `console.warn()` for logging
- Graceful degradation: Missing Procore config triggers warning but app continues: `console.warn("ProcoreProjects config not found, skipping.")`

**Error Propagation:**
- Errors logged but not always re-thrown
- Failed operations may silently complete or show user alerts
- Network errors (POST to Google Script) caught but only logged

## Logging

**Framework:** Browser `console` (no logging library)

**Patterns:**
- `console.error()` for exceptions and failures
- `console.warn()` for non-fatal issues (missing config)
- No `console.log()` statements in production code
- Errors logged with full error object: `console.error(e)`

**When to Log:**
- Errors in catch blocks
- Configuration issues on startup
- User alerts for data loading failures

## Comments

**Guidelines Observed:**
- Section headers with uppercase markers: `// --- CONFIGURATION ---`, `// --- HELPERS ---`
- Inline comments for complex logic: `// Safety: If cursor is way behind startDate, advance it` (line 202)
- Data transformation notes: `// Ensure DataType matches what the Dashboard expects` (line 67)
- Fix explanations: `// Fix: Force Payroll/Headcount items to 'Headcount' Control_Type` (line 152)

**JSDoc/TSDoc:**
- Not used; JavaScript only with implicit types

## Function Design

**Size:**
- Typical range: 10-50 lines
- Larger functions for complex rendering: `renderDashboard()` (~75 lines), `renderModuleView()` (~200 lines)
- Helper functions kept concise: `getFiltered()` (1 line), `fmt()` (1 line), `getNextFriday()` (8 lines)

**Parameters:**
- Short parameter lists: 1-3 parameters typical
- Complex operations accept single object parameter (e.g., `sum(week, filters, dataset)`)
- Optional parameters with defaults: `dataset = rawData`

**Return Values:**
- Functions return values directly without wrapping
- Render functions return HTML strings
- Data transformation functions return processed arrays or objects
- No explicit null/undefined handling documented

## Module Design

**Exports:**
- Single HTML file with global `window` API exposure
- Functions intended as public API assigned to `window`: `window.setView()`, `window.saveEntry()`, `window.renderChart()`
- Module-level variables not exported (accessed internally only)

**Barrel Files:**
- Not applicable; single-file architecture

**Data Flow:**
- All data flows through `rawData` global array
- UI state managed in module-level variables
- Re-render pattern: modify state, call `renderLayout()`

## Type Safety

**JavaScript:**
- No TypeScript used
- Implicit types throughout
- Type coercion relied upon: `Number(localStorage.getItem(...))`, `parseFloat(item.Amount)`

## Mutation Patterns

**State Mutations:**
- Direct mutation of global state common: `rawData.push()`, `projectList[value] = ...`
- Array methods causing mutation: `.forEach(d => d.Property = value)` (line 520)
- Object spread NOT used for updates
- State copies only for UI rendering, not for immutability

**Anti-pattern Observed:**
```javascript
// Line 520: Direct mutation of array elements
rawData.forEach(d => {
    if (d.Project === projName) {
        d.Project = value;  // MUTATION
    }
});
```

## Currency and Number Formatting

**Consistent Pattern:**
```javascript
const fmt = (num) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
}).format(num);

const fmtCompact = (num) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: "compact",
  maximumFractionDigits: 1
}).format(num);
```
- Used throughout for displaying monetary values
- No hardcoded currency symbols

## Date Handling

**Pattern:**
```javascript
function getNextFriday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = 5 - day;  // 5 = Friday
    if (diff < 0) d.setDate(d.getDate() + (diff + 7));
    else d.setDate(d.getDate() + diff);
    return d;
}
```
- ISO string format for week-ending dates: `YYYY-MM-DD`
- Dates converted to ISO strings when storing: `.toISOString().split('T')[0]`
- Calculated from current date for filtering: `new Date().toISOString().split('T')[0]`

---

*Convention analysis: 2026-03-30*
