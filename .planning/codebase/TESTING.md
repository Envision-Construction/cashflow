# Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Status:** Not Configured

**Runner:**
- No test framework configured (no Jest, Vitest, Mocha, etc.)
- `package.json` test script: `"test": "echo \"Error: no test specified\" && exit 1"`
- No test files present in codebase

**Assertion Library:**
- Not used

**Run Commands:**
```bash
npm test              # Currently fails with "Error: no test specified"
```

## Test Coverage

**Requirements:** Not enforced - no test suite exists

**Current Status:** 0% coverage

## Test File Organization

**Location:**
- No test files found
- Codebase is single-file architecture: `/Users/avireddy/GitHub/cashflow/.vscode/index.html`
- Would require client-side testing framework for browser-based code

**Naming Convention:**
- Not established; no tests to reference

**Structure:**
- Not applicable

## Testing Approach

**Client-Side Testing Options (Not Implemented):**

For testing this browser-based JavaScript application, these approaches could be used:

**Unit Testing (Recommended):**
- Extract functions into separate modules and use Vitest or Jest
- Functions to test:
  - `getFiltered()` - filter data by type
  - `fmt()`, `fmtCompact()` - number formatting
  - `sum()` - aggregate amounts by week and filters
  - `processFinancingData()` - liability schedule expansion
  - `processOpBudgetData()` - operating budget template expansion
  - `generateOpBudgetSchedule()` - recurring expense generation
  - `generateLiabilitySchedule()` - payment schedule generation
  - `getNextFriday()` - date calculation
  - `getAllFridays()` - month Friday calculation

**Integration Testing (Recommended):**
- Firebase Firestore read operations (`getDocs`, `getDoc`)
- Google Script webhook POST requests
- Modal form interactions
- Data persistence to localStorage

**E2E Testing (For Critical Flows):**
- Dashboard rendering with fetched data
- Week-to-week cash balance projection
- Modal form submission and data saving
- View switching between modules
- Search and filter functionality

## Mocking

**Current State:** No mocks exist

**Firebase Mocking (If Tests Were Added):**
```javascript
// Example mock structure (not implemented)
jest.mock('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js', () => ({
  getDocs: jest.fn().mockResolvedValue({
    forEach: jest.fn((callback) => {
      // Mock data iteration
    })
  }),
  getDoc: jest.fn().mockResolvedValue({
    exists: jest.fn(() => true),
    data: jest.fn(() => ({
      projectList: '{}'
    }))
  })
}));
```

**What to Mock:**
- Firebase Firestore collection and document reads
- Google Scripts API responses
- Chart.js instance creation
- DOM elements for render testing

**What NOT to Mock:**
- Number formatting (`Intl.NumberFormat`)
- Date calculations (pure functions)
- Data transformation logic
- Currency logic

## Test Types

**Not Currently Implemented:**

### Unit Tests (Would Test):
- Data transformations: `processFinancingData()`, `processOpBudgetData()`
- Calculations: `sum()`, balance projections
- Formatting: `fmt()`, `fmtCompact()`
- Date utilities: `getNextFriday()`, `getAllFridays()`
- Filters: `getFiltered()`

**Example Unit Test Structure (Not Implemented):**
```javascript
describe('Data Transformations', () => {
  it('should expand financing liability schedule', () => {
    const item = {
      DataType: 'Financing',
      Liability_ID: 'L1',
      Creditor: 'Bank',
      First_Payment: '2026-01-01',
      Occurrences: 12,
      Frequency: 'monthly',
      Amount: 5000
    };

    const result = generateLiabilitySchedule(item);

    expect(result).toHaveLength(12);
    expect(result[0]).toHaveProperty('Week_Ending');
    expect(result[0]).toHaveProperty('Amount', 5000);
  });
});
```

### Integration Tests (Would Test):
- Firebase data loading in `init()`
- Google Script webhook POST in `updatePipelineAmount()`
- Modal form submission in `saveEntry()`
- localStorage read/write (`editTarget()`, `editOpening()`)

**Example Integration Test Structure (Not Implemented):**
```javascript
describe('Firebase Integration', () => {
  beforeEach(async () => {
    // Mock Firebase
  });

  it('should fetch and normalize cash flow data', async () => {
    // Initialize with mock data
    await init();

    // Verify data was normalized
    expect(rawData).toBeDefined();
    expect(weeks).toBeDefined();
  });
});
```

### E2E Tests (Would Test):
- Full user flow: load app → view dashboard → switch views → enter data → see updates
- Critical paths: opening balance changes → dashboard updates
- Error scenarios: missing Procore config → fallback to local mode
- Chart rendering with actual data

## Async Testing

**Current Pattern:** No async tests exist

**Async Functions in Codebase:**
- `init()` - fetches from Firebase
- `updatePipelineAmount()` - POSTs to Google Script
- `saveEntry()` - saves to Firebase and Google Script

**How Tests Would Handle Async:**
```javascript
// Using async/await (recommended)
it('should save entry to Firebase', async () => {
  const entry = { /* mock entry */ };
  await window.saveEntry();
  // Verify Firebase was called
});

// Using done callback (if needed for older frameworks)
it('should handle errors in saveEntry', (done) => {
  // Test async error handling
  done();
});
```

## Error Testing

**Error Scenarios Not Currently Tested:**

1. **Firebase Connection Failure:**
   - `init()` should handle gracefully (currently shows alert)
   - Procore config missing is handled with warning

2. **Invalid Data:**
   - `parseFloat()` of non-numeric values
   - Missing required fields in form submission
   - Invalid date formats

3. **Network Failures:**
   - Google Script POST request timeout
   - Firebase `getDocs` rejection
   - Currently caught and logged, but no retry logic

**Current Error Handling Code:**
```javascript
try {
    const snapshot = await getDocs(collection(db, "CashFlow"));
    // Process data
} catch (e) {
    console.error(e);
    alert("Data Load Error. Check console.");
}
```

## Test Data and Fixtures

**Current State:** No fixtures defined

**What Fixtures Would Look Like:**

```javascript
// Mock CashFlow document
const mockCashFlowData = [
  {
    Week_Ending: '2026-01-03',
    DataType: 'WIP',
    Project: 'Project A',
    Amount: 50000,
    Category: 'Receipts'
  },
  {
    Week_Ending: '2026-01-03',
    DataType: 'ProjectCF',
    Project: 'Project A',
    Amount: -30000
  }
];

// Mock configuration
const mockConfig = {
  projectList: {
    'Project A': { name: 'Project A', stage: 'Active' }
  }
};
```

## Coverage

**Requirements:** None enforced

**Target (If Established):** 80%+ recommended for financial application

**Gaps (Untested Areas):**
- All UI rendering functions: `renderDashboard()`, `renderModuleView()`, `renderSidebar()`
- DOM event handlers: click handlers in buttons, form submissions
- State management updates
- Chart rendering (`renderChart()`)
- Sticky column positioning (`updateStickyOffsets()`)
- All modal form interactions
- localStorage operations for settings

## Manual Testing Current State

**How Code is Currently Tested:**
1. Browser-based manual testing by opening `index.html`
2. Visual verification of:
   - Dashboard displays correct data
   - Cash balance calculations are accurate
   - Chart renders with correct data
   - Modal forms work and save data
   - Different views (Dashboard, WIP Forecast, Pipeline, etc.) render correctly

**Critical Paths to Verify:**
1. Data load from Firebase → Dashboard renders with correct balances
2. Opening cash balance changed → All projections update
3. Entry added via modal → Data appears in relevant view
4. Pipeline forecast month shifted → Correct weeks displayed
5. MinCash target updated → KPI alerts shown correctly

## Dependencies

**Required for Testing (Not Installed):**

For Unit Tests:
```json
{
  "devDependencies": {
    "vitest": "^latest",
    "@testing-library/jest-dom": "^latest"
  }
}
```

For E2E Tests:
```json
{
  "devDependencies": {
    "playwright": "^latest"
  }
}
```

For Firebase Testing:
```json
{
  "devDependencies": {
    "@firebase/testing": "^latest"
  }
}
```

## Next Steps to Add Testing

1. **Refactor to Extract Testable Modules:**
   - Move data transformation functions to separate module
   - Extract pure calculation functions
   - Separate rendering logic from data logic

2. **Add Test Framework:**
   - Install Vitest for client-side unit tests
   - Install Playwright for E2E tests
   - Configure test scripts in `package.json`

3. **Write Core Tests:**
   - Data transformation tests (100% coverage)
   - Calculation tests (100% coverage)
   - Firebase integration tests
   - Critical user flow E2E tests

4. **Set Coverage Requirements:**
   - Enforce 80%+ coverage in CI/CD pipeline
   - Exclude rendering functions from coverage initially

---

*Testing analysis: 2026-03-30*
