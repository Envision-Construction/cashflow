# Codebase Concerns

**Analysis Date:** 2026-03-30

## Security Issues

**Hardcoded Firebase Credentials:**
- Issue: Firebase API key and configuration exposed in client-side code
- Files: `.vscode/index.html` (lines 32-39)
- Details: `apiKey: "AIzaSyCTL6KFc45icS6fuZiQ9XpBpHU8SJbKtOo"` and other sensitive credentials are hardcoded
- Impact: Anyone with access to the HTML file can access Firebase resources; credentials should be environment-based
- Risk: HIGH - Public exposure of API keys compromises backend security
- Fix approach: Move Firebase config to environment variables or use serverless functions to provision tokens; never expose keys in client code

**Hardcoded External Service URLs:**
- Issue: Google Apps Script URL exposed in source
- Files: `.vscode/index.html` (line 40)
- Details: `GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyvPFMTM_5M2ahhS29Jf8lKZD5Xk6VJ_fv7ihzdKpYnoYfeVJG-qzPEmY6lmoygClfP/exec"`
- Impact: Anyone can call this Google Apps Script endpoint; if it has insufficient validation, this is a vulnerability vector
- Risk: MEDIUM - Depends on script's input validation
- Fix approach: Store URL in backend environment config; add request signing/validation in Google Apps Script

**XSS Vulnerability via innerHTML:**
- Issue: Multiple uses of `innerHTML` assignment with unsanitized user input
- Files: `.vscode/index.html` (lines 328, 344, 371, 374, 1122, and more)
- Details: Dynamic HTML is constructed and inserted via `innerHTML` without escaping. User-editable fields like project names are embedded directly in HTML templates
- Examples:
  - Line 686: `<select onchange="window.updatePipelineMeta('${p.name.replace(/'/g, "\\'")}', 'Source', this.value)"`
  - Line 720: `onblur="window.updatePipelineAmount('${p.name.replace(/'/g, "\\'")}', '${m.key}', this)"`
- Impact: If project names contain malicious HTML/JavaScript, it will execute in user's browser
- Risk: HIGH - Can lead to session hijacking, credential theft, data exfiltration
- Scenario: User creates project named `<img src=x onerror="stealData()">`; script executes when rendered
- Fix approach:
  1. Replace `innerHTML` with `textContent` where possible
  2. Use `createElement` and `appendChild` for dynamic content
  3. Sanitize all user input before rendering (use DOMPurify or similar)
  4. Use template literals carefully - escape special characters

**No CSRF Protection:**
- Issue: No CSRF tokens on state-changing operations
- Files: `.vscode/index.html` (various fetch calls: lines 579, 1421)
- Details: `fetch(GOOGLE_SCRIPT_URL)` POST requests have no CSRF token validation
- Impact: Attacker could craft malicious page that triggers unwanted state changes
- Risk: MEDIUM - Requires user to visit malicious site while authenticated
- Fix approach: Implement CSRF token generation and validation in Google Apps Script; verify origin headers

**No Input Validation:**
- Issue: User inputs not validated before processing
- Files: `.vscode/index.html` (lines 546, 1279, 1346, 1364)
- Details: `parseFloat(input.value.replace(/[^0-9.-]+/g,""))` creates numbers without type checking or bounds validation
- Example: Lines 51-52 read from `localStorage` and convert to numbers with no validation
- Impact: Invalid data can corrupt state; no protection against injection attacks
- Risk: MEDIUM - Could cause calculation errors or data corruption
- Fix approach: Add schema validation using Zod or similar; validate all external inputs at boundaries

## Tech Debt

**No Testing Infrastructure:**
- Issue: `"test": "echo \"Error: no test specified\" && exit 1"`
- Files: `package.json` (line 7)
- Impact: No test coverage; changes break silently; regressions undetected
- Priority: CRITICAL - Cash flow calculations must be verified
- Fix approach: Set up Jest or Vitest; write unit tests for all calculation functions (sum, format, date logic)

**Monolithic Single-File Application:**
- Issue: Entire application (1590+ lines) in one HTML file
- Files: `.vscode/index.html`
- Problems:
  - No code reusability between files
  - Difficult to test individual functions
  - Hard to maintain and debug
  - No module/component separation
  - Extremely fragile - one bug affects entire app
- Fix approach: Split into separate modules: `dashboard.js`, `pipeline.js`, `budget.js`, `utils.js`, `api.js`; use bundler (Vite, Webpack) to organize

**Global State Management:**
- Issue: Multiple global variables mutated throughout the codebase
- Files: `.vscode/index.html` (lines 46-56)
- Variables: `rawData`, `projectList`, `weeks`, `currentView`, `includePipeline`, `minCashTarget`, `openingCashBalance`, `chartInstance`, `searchQuery`, `activeOpBudgetFilter`, `pipelineStartMonth`
- Problems:
  - State changes are unpredictable and hard to trace
  - Multiple functions modify shared state without clear ownership
  - Race conditions possible with async operations
  - Difficult to debug state corruption
- Examples of mutation without return:
  - Line 519: `rawData.forEach(d => { if (d.Project === projName) { d.Project = value; } })`
  - Line 535: `rawData.forEach(d => { if (d.Project === projName) { d.Source = value; } })`
- Fix approach: Implement centralized state management (Redux-like pattern or Vuex); use immutable updates; provide clear state getter/setter functions

**Direct DOM Mutations:**
- Issue: Direct manipulation of DOM without proper lifecycle management
- Files: `.vscode/index.html` (lines 381-410, 1244)
- Details: Event listeners and DOM updates scattered throughout; no clear rendering pipeline
- Example: Line 409 `window.addEventListener('resize', window.updateStickyOffsets);` - listener added multiple times on re-render
- Impact: Memory leaks, orphaned listeners, performance degradation
- Fix approach: Use React/Vue for declarative UI; clean up listeners in effect cleanup; use single event delegation pattern

**No Error Recovery:**
- Issue: Errors caught but not handled gracefully
- Files: `.vscode/index.html` (lines 110-113, 586-588, 1420-1422)
- Details: `alert()` used for error messages; no retry logic or fallback
- Examples:
  - Line 112: `alert("Data Load Error. Check console.");` - user told to check console
  - Line 587: `alert("Error saving adjustment: " + e.message);` - error message may leak implementation details
- Impact: Poor user experience; no way to recover from transient failures
- Fix approach: Implement retry logic with exponential backoff; use toast notifications instead of alerts; log errors to server-side logger

**Unsafe Date Handling:**
- Issue: Date arithmetic performed without timezone handling
- Files: `.vscode/index.html` (lines 56, 88-91, 140-145, 199-210, 226-254, 272-303)
- Details: `new Date()` creates local dates; operations assume single timezone
- Problems:
  - Week boundaries may shift across timezones
  - Daylight saving time transitions ignored
  - Date comparisons unreliable
- Examples:
  - Line 90: `const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);` - doesn't account for timezone
  - Line 559-560: Month parsing from string assumes specific format
- Fix approach: Use date-fns or Day.js for timezone-aware date operations; store all dates in ISO format (YYYY-MM-DD); use UTC internally

**No Data Persistence Strategy:**
- Issue: localStorage used for preferences; no backup/recovery mechanism
- Files: `.vscode/index.html` (lines 51-52)
- Details: `minCashTarget` and `openingCashBalance` stored in localStorage without encryption or validation
- Impact: User loses data on browser clear; no way to share settings across devices
- Risk: MEDIUM - Cash flow numbers could be lost
- Fix approach: Persist to Firestore or backend database; add export/import for backup; version settings

**Unsafe Math Operations:**
- Issue: Floating-point arithmetic used for currency
- Files: `.vscode/index.html` (multiple lines: 120, 160-164, 422-426, etc.)
- Example: Line 120 `reduce((acc, c) => acc + (Number(c.Amount)||0), 0)` - floating point errors accumulate
- Impact: Rounding errors in cash calculations; penny-level discrepancies compound
- Fix approach: Use integer arithmetic (store amounts in cents) or use decimal.js library; never use `+=` for currency

**Commented-Out Code and Dead Branches:**
- Issue: Scattered dead code and commented sections make maintenance harder
- Files: `.vscode/index.html` (search for commented sections would find examples)
- Impact: Unclear what code is actually used; confuses future maintainers
- Fix approach: Remove all dead code; use git history to recover if needed

## Performance Bottlenecks

**Inefficient Filtering and Aggregation:**
- Issue: Multiple full-table scans for filtering and summing
- Files: `.vscode/index.html` (lines 117-120, 419-426)
- Details:
  - `getFiltered()` scans entire `rawData` array multiple times per render
  - `sum()` function filters then reduces on each call
  - Dashboard renders all 20 weeks, each requiring multiple passes through data
- Impact: O(n*m) complexity where n=weeks, m=data rows; slow with large datasets
- Fix approach: Pre-compute aggregations; cache filtered results; use Map/Set for lookups

**Unoptimized Rendering:**
- Issue: Full re-render on every state change
- Files: `.vscode/index.html` (lines 370-379, 499, 504, etc.)
- Details: `renderLayout()` reconstructs entire DOM; no diffing or incremental updates
- Impact: Jank with large data sets; flashing UI
- Fix approach: Implement virtual scrolling for large tables; use React/Vue for efficient diffing

**No Debouncing on Input Events:**
- Issue: `onblur` handlers trigger updates immediately without debouncing
- Files: `.vscode/index.html` (line 720)
- Impact: Multiple requests sent for rapid edits; server overwhelmed
- Fix approach: Add debounce wrapper to input handlers; batch updates

**Sticky Column Calculation on Every Resize:**
- Issue: Complex DOM queries run on every window resize
- Files: `.vscode/index.html` (lines 381-410)
- Details: `updateStickyOffsets()` queries all sticky columns and cells on every resize event
- Impact: Jank during window resize; unoptimized selector queries
- Fix approach: Use CSS `position: sticky` instead; only update on significant breakpoint changes

## Fragile Areas

**Date Parsing Logic:**
- Files: `.vscode/index.html` (lines 179-304, 559-560, 635-637)
- Why fragile:
  - Assumes dates in specific format (YYYY-MM-DD)
  - Manual date arithmetic error-prone
  - Week-ending calculation spread across multiple functions
  - No validation of date strings before parsing
- Safe modification:
  - Add date validation schema at input boundary
  - Create single `parseWeekEnding()` utility function
  - Use date-fns for all calculations
  - Write tests for edge cases (year boundaries, leap years, DST)

**Pipeline Metadata Sync:**
- Files: `.vscode/index.html` (lines 506-544)
- Why fragile:
  - State split between `projectList` and `rawData`
  - Updates must modify both simultaneously
  - Project renaming affects lookup keys - breaks references
  - No single source of truth
- Problems:
  - Line 511: `projectList[value] = { ...projectList[projName], name: value };` creates copy
  - Line 519-523: Separately updates `rawData` - could partially fail
  - If rename fails halfway, data is corrupted
- Safe modification:
  - Create single `updateProject()` function that updates both atomically
  - Add transaction-like wrapper for multi-step updates
  - Tests for project renaming edge cases

**Cash Balance Calculation:**
- Files: `.vscode/index.html` (lines 414-436)
- Why fragile:
  - Floating-point arithmetic on currency
  - Order of operations matters (expenses vs inflows)
  - No validation that balance doesn't go negative
  - "13-Week Low" logic uses future weeks only (lines 429-436)
- Issues:
  - Line 425: `currentBal += net;` - floating point accumulation
  - Line 431: `filter((_, i) => weeksList[i] >= todayStr)` - assumes synchronous indexes
  - Missing min balance warning logic
- Safe modification:
  - Use integer arithmetic or Decimal library
  - Add explicit balance validation assertions
  - Write tests with known good cash flow scenarios
  - Test edge case: what if all future weeks are negative?

**Operating Budget Template Expansion:**
- Files: `.vscode/index.html` (lines 138-177, 179-255)
- Why fragile:
  - Complex date math in `generateOpBudgetSchedule()`
  - Multiple frequency types (Weekly, Bi-Weekly, Monthly) with different logic
  - Pay_Cycle field has magic values ('1st Week', '2nd Week', etc.)
  - No validation that generated dates are sensible
- Problems:
  - Line 241: `fridays[3] || fridays[fridays.length - 1]` - fallback silently skips invalid pay cycles
  - Line 283: Safety limit hardcoded to 520 (10 years) - no config
  - Leap month handling unclear
- Safe modification:
  - Extract pay cycle calculation to separate function with tests
  - Add schema validation for input parameters
  - Test all frequency combinations with multiple months
  - Document why 10-year limit exists

**Google Apps Script Integration:**
- Files: `.vscode/index.html` (lines 40, 579-584, 1419-1423)
- Why fragile:
  - External script URL hardcoded
  - `no-cors` mode means errors are silent
  - No request signing or authentication
  - Script could be offline without user knowing
  - Payload structure unknown (Lines 562-570, 1326-1343)
- Problems:
  - Line 581: `mode: 'no-cors'` - response status unknown, can't detect failures
  - Line 583: `body: JSON.stringify(payload)` - script must trust JSON format
  - No idempotency key - duplicate submissions create duplicate records
- Safe modification:
  - Add request authentication (JWT or API key)
  - Implement response verification (even with no-cors, check for errors)
  - Add idempotency tokens
  - Implement retry with exponential backoff
  - Document expected payload schema

## Scaling Limits

**Firebase Firestore Read Limits:**
- Current capacity: Unlimited reads, but costs scale linearly
- Limit: Every `init()` call reads entire CashFlow collection (lines 62-64)
- Problem: As data grows (thousands of entries), load time increases; no pagination
- Scaling path:
  1. Implement pagination: Fetch last 90 days of data only
  2. Add server-side aggregation: Calculate sums on backend
  3. Cache results with TTL
  4. Monitor Firestore costs

**localStorage Limits:**
- Current capacity: 5-10MB per browser (implementation specific)
- Limit: All data kept in memory; no cleanup
- Problem: Large `rawData` array never cleared; memory usage grows
- Scaling path:
  1. Add data expiration: Clear data older than 6 months
  2. Implement client-side database (IndexedDB) for larger data
  3. Paginate week display (show 20 weeks, lazy-load older data)

**DOM Complexity:**
- Current: Tables with 100+ rows and 20+ columns render full DOM
- Limit: Browser rendering slows with >1000 DOM nodes
- Problem: Pipeline Forecast table can have 500+ cells; all rendered at once
- Scaling path:
  1. Implement virtual scrolling (render only visible rows)
  2. Use canvas-based table rendering for very large datasets
  3. Implement server-side pagination

## Missing Critical Features

**No Data Validation on Import:**
- Problem: Firebase data loaded without schema validation
- Blocks: Can't guarantee data integrity; corrupted records silently cause wrong calculations
- Impact: A single malformed record breaks entire cash flow forecast
- Fix approach: Add Zod schema validation at data boundaries (lines 62-64)

**No Audit Trail:**
- Problem: No record of who changed what when
- Blocks: Can't investigate data discrepancies; no accountability
- Impact: Financial accuracy compromised; compliance issues
- Fix approach: Store all changes in separate audit log collection; include user, timestamp, old value, new value

**No Multi-User Collaboration:**
- Problem: All edits are local to browser; no conflict resolution
- Blocks: Two users editing same project simultaneously causes data loss
- Impact: Incorrect forecasts; lost work
- Fix approach: Implement Operational Transformation or CRDT; add conflict resolution UI

**No Export/Import:**
- Problem: No way to backup or share data
- Blocks: Users can't version forecasts or migrate to other systems
- Impact: Data loss if Firestore goes down; lock-in to Firebase
- Fix approach: Add CSV/Excel export; implement bulk import with validation

**No Offline Support:**
- Problem: App requires constant internet connection
- Blocks: Can't use offline; real-time collaboration not possible
- Impact: Poor UX in unreliable networks
- Fix approach: Use service workers and IndexedDB for offline-first architecture

## Test Coverage Gaps

**No Unit Tests:**
- What's not tested: All utility functions (fmt, fmtCompact, sum, getFiltered)
- Files: `.vscode/index.html` (lines 118-120)
- Risk: Format bugs cause incorrect display; sum bugs cause wrong forecasts
- Priority: CRITICAL for financial calculations
- Example test missing: `sum()` with edge cases (empty filters, zero amounts, null values)

**No Integration Tests:**
- What's not tested: Firebase read/write cycle; Google Apps Script calls
- Risk: Undetected failures in data persistence
- Priority: HIGH
- Example test: Update cash balance, verify it persists and reloads correctly

**No E2E Tests:**
- What's not tested: Full user flows (create project, add forecast, view dashboard)
- Risk: UI-level bugs undetected
- Priority: MEDIUM
- Example test: User creates new project with forecast amounts; verify it appears in Pipeline grid

**No Date Edge Cases:**
- What's not tested: Year boundaries, leap years, DST transitions, timezone handling
- Risk: Forecasts off by 1 week at year end
- Priority: MEDIUM

**No Error Scenario Tests:**
- What's not tested: Firebase offline, invalid input, corrupted data, Google Apps Script failure
- Risk: Application behavior undefined in failure scenarios
- Priority: HIGH

---

*Concerns audit: 2026-03-30*
