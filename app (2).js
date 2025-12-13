/*
 * Cash Flow Analytics Application (aligned to 13‑week workbook spec)
 * Key changes vs original:
 *  - Corrected shift direction (positive => later)
 *  - Added GR category (negative) and normalized QuickPay as negative cash outflows
 *  - Per‑category shift policy (Projects: macro+timing; GR/OpEx: expense only; QP/Fin/LOC: none)
 *  - Ending Cash = Beginning Cash + cumulative(Net CF) + cumulative(Treasury moves)
 *  - Safe shaded fill between High and Low by label
 *  - Input step granularity improved
 *  - Optional QuickPay funding derivation hook (off by default)
 */

// -----------------------------------------------------------------------------
// Dates (Friday EOW). Keep as-is or generate programmatically if needed.
// -----------------------------------------------------------------------------
const dates = [
  '2025-08-01','2025-08-08','2025-08-15','2025-08-22','2025-08-29',
  '2025-09-05','2025-09-12','2025-09-19','2025-09-26','2025-10-03',
  '2025-10-10','2025-10-17','2025-10-24','2025-10-31','2025-11-07',
  '2025-11-14','2025-11-21','2025-11-28','2025-12-05','2025-12-12',
  '2025-12-19','2025-12-26','2026-01-02'
];

// -----------------------------------------------------------------------------
// Default values per category. IMPORTANT: QuickPay values are negative (payments).
// Added GR (project-level) and Treasury (weekly moves; default zeros).
// -----------------------------------------------------------------------------
const defaultValues = {
  wip: new Array(dates.length).fill(0),
  pipeline: new Array(dates.length).fill(0),
  gr: new Array(dates.length).fill(0), // GR = negative outflows
  quickpay: [
    // QuickPay PAYMENTS (cash outflows) — NEGATIVE by convention
    -1146505.0, -1051870.0, -1729832.0, 0.0, -3425962.0, -139671.0, -1263712.0,
    -17737.0, -2106714.0, -1730274.0, -1765608.0, -850518.0, -6505.0, -3395038.0,
    0.0, -2595430.0, -480000.0, -1773652.0, -4222162.0, -1202520.0, -410484.0,
    -1720398.0, -4992824.0
  ],
  operating: [
    -375416.79, -137557.74, 39692.66333, -16765.0, -21521.73, 396021.0,
    -5132.27, 1281092.88, 1069908.67, -650481.78, 496808.34, 383964.608,
    -11304.25, 539603.135, -769930.57, 120199.271, -259376.87, 910752.789,
    649822.88, 419635.948, -800782.62, 885249.235, 1184332.88
  ],
  financing: [
    -100000.0,-10000.0,-69764.0,0.0,-19000.0,-200000.0,
    0.0,-183785.5,0.0,-119000.0,0.0,0.0,
    0.0,0.0,-119000.0,0.0,0.0,0.0,
    -119000.0,0.0,0.0,0.0,-119000.0
  ],
  loc: new Array(dates.length).fill(0),
  treasury: new Array(dates.length).fill(0) // weekly moves (Row 28); +out of treasury into ops; −into treasury
};

// -----------------------------------------------------------------------------
// Data: categories with projects. GR & Treasury included; Treasury is data-only.
// -----------------------------------------------------------------------------
const data = {
  wip:       { projects: [ { name: 'Project 1', values: defaultValues.wip.slice() } ] },
  pipeline:  { projects: [ { name: 'Project 1', values: defaultValues.pipeline.slice() } ] },
  gr:        { projects: [ { name: 'General Requirements', values: defaultValues.gr.slice() } ] },
  quickpay:  { projects: [ { name: 'General', values: defaultValues.quickpay.slice() } ] },
  operating: { projects: [ { name: 'General', values: defaultValues.operating.slice() } ] },
  financing: { projects: [ { name: 'General', values: defaultValues.financing.slice() } ] },
  loc:       { projects: [ { name: 'General', values: defaultValues.loc.slice() } ] },
  treasury:  { projects: [ { name: 'Brex Treasury Moves', values: defaultValues.treasury.slice() } ] }
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function getAggregatedValues(category) {
  const n = dates.length;
  const result = new Array(n).fill(0);
  const catData = data[category];
  if (!catData || !catData.projects) return result;
  catData.projects.forEach((proj) => {
    for (let i = 0; i < n; i++) {
      const val = parseFloat(proj.values[i]) || 0;
      result[i] += val;
    }
  });
  return result;
}

// Keep for reference; not used elsewhere directly
function shiftArray(arr, shift) {
  const n = arr.length;
  const result = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const j = i - shift;
    if (j >= 0 && j < n) result[i] = arr[j];
  }
  return result;
}

/**
 * Core shifter (corrected): positive shifts move values to the future (right).
 * macroShift applies to all values; timingShift applies ONLY to receipts (>0);
 * expenseShift applies ONLY to outflows (<0). Collisions are summed.
 */
function shiftCategory(arr, macroShift, timingShift, expenseShift) {
  const n = arr.length;
  const result = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const val = Number(arr[i]) || 0;
    let j = i + macroShift;            // positive => later
    if (val > 0) j += timingShift;
    else if (val < 0) j += expenseShift;
    if (j >= 0 && j < n) result[j] += val;
  }
  return result;
}

/**
 * Optional QuickPay dynamic: funding ≈ 0.8 × next week's project receipts (1 week earlier),
 * netted with entered QuickPay payments (already negative). OFF by default.
 */
const USE_DERIVED_QP = false;
function deriveQuickPayNet(projectReceipts, qpPayments, fundingPct = 0.8) {
  const n = projectReceipts.length;
  const net = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const funding = i < n - 1 ? fundingPct * (Number(projectReceipts[i + 1]) || 0) : 0;
    const payments = Number(qpPayments[i]) || 0; // already negative
    net[i] = funding + payments;
  }
  return net;
}

/**
 * Compute category flows with correct shift policy per workbook logic.
 * Returns totals + per-category series (treasury handled later in ending cash).
 */
function computeFlows(macroShift, timingShift, expenseShift) {
  const n = dates.length;

  // Aggregate sources
  const wipAgg      = getAggregatedValues('wip');
  const pipelineAgg = getAggregatedValues('pipeline');
  const projectReceipts = new Array(n).fill(0);
  for (let i = 0; i < n; i++) projectReceipts[i] = (wipAgg[i] || 0) + (pipelineAgg[i] || 0);

  const grAgg    = getAggregatedValues('gr');         // negative
  let qpAgg      = getAggregatedValues('quickpay');    // negative (payments)
  const opAgg    = getAggregatedValues('operating');
  const finAgg   = getAggregatedValues('financing');
  const locAgg   = getAggregatedValues('loc');

  // Optional QuickPay net (funding + payments)
  if (USE_DERIVED_QP) {
    qpAgg = deriveQuickPayNet(projectReceipts, qpAgg);
  }

  // Apply shift policy
  const projShifted = shiftCategory(projectReceipts, macroShift, timingShift, 0); // macro+timing
  const grShifted   = shiftCategory(grAgg,         0, 0, expenseShift);          // expense only
  const opShifted   = shiftCategory(opAgg,         0, 0, expenseShift);          // expense only
  const qpShifted   = shiftCategory(qpAgg,         0, 0, 0);                     // fixed schedule
  const finShifted  = shiftCategory(finAgg,        0, 0, 0);                     // fixed schedule
  const locShifted  = shiftCategory(locAgg,        0, 0, 0);                     // fixed schedule

  // Net cash flow (per week)
  const total = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    total[i] = (projShifted[i] || 0) + (grShifted[i] || 0) + (qpShifted[i] || 0)
             + (opShifted[i] || 0) + (finShifted[i] || 0) + (locShifted[i] || 0);
  }

  return {
    total,
    project: projShifted,
    gr: grShifted,
    quickpay: qpShifted,
    operating: opShifted,
    financing: finShifted,
    loc: locShifted
  };
}

function cumulative(initial, flows) {
  const result = new Array(flows.length).fill(0);
  let total = Number(initial) || 0;
  for (let i = 0; i < flows.length; i++) {
    total += Number(flows[i]) || 0;
    result[i] = total;
  }
  return result;
}

// -----------------------------------------------------------------------------
// Category configuration and charts
// -----------------------------------------------------------------------------
const categoryConfig = {
  wip:       { tableId: 'wipTable',      chartId: 'wipChart',      label: 'WIP',             colour: 'rgba(54, 94, 255, 0.7)' },
  pipeline:  { tableId: 'pipelineTable', chartId: 'pipelineChart', label: 'Pipeline',       colour: 'rgba(77, 166, 255, 0.7)' },
  gr:        { tableId: 'grTable',       chartId: 'grChart',       label: 'GR (Project)',    colour: 'rgba(142, 68, 173, 0.7)' },
  quickpay:  { tableId: 'quickpayTable', chartId: 'quickpayChart', label: 'QuickPay',        colour: 'rgba(0, 191, 166, 0.7)' },
  operating: { tableId: 'operatingTable',chartId: 'operatingChart',label: 'Operating',       colour: 'rgba(255, 183, 77, 0.7)' },
  financing: { tableId: 'financingTable',chartId: 'financingChart',label: 'Financing',       colour: 'rgba(255, 111, 97, 0.7)' },
  loc:       { tableId: 'locTable',      chartId: 'locChart',      label: 'Lines of Credit', colour: 'rgba(247, 209, 84, 0.7)' }
};

function buildLegend(chart, legendId) {
  const legendEl = document.getElementById(legendId);
  if (!legendEl) return;
  legendEl.innerHTML = '';
  chart.data.datasets.forEach((ds) => {
    const item = document.createElement('div');
    item.classList.add('legend-item');
    const color = ds.borderColor || ds.backgroundColor || '#ccc';
    item.innerHTML = `<span class="legend-color" style="background:${color}"></span><span class="legend-label">${ds.label}</span>`;
    legendEl.appendChild(item);
  });
}

const categoryCharts = {};

function addProject(category) {
  const catData = data[category];
  if (!catData || !catData.projects) return;
  const idx = catData.projects.length + 1;
  const newName = `Project ${idx}`;
  const newValues = new Array(dates.length).fill(0);
  catData.projects.push({ name: newName, values: newValues });
  renderTable(category);
  updateCategoryChart(category);
  if (category === 'wip' || category === 'pipeline') updateProjectChart();
  updateCharts();
}

function renderTable(category) {
  const cfg = categoryConfig[category];
  const container = document.getElementById(cfg?.tableId);
  if (!container) return;

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const thProject = document.createElement('th');
  thProject.textContent = 'Project';
  headerRow.appendChild(thProject);

  dates.forEach((date) => {
    const th = document.createElement('th');
    th.textContent = date;
    headerRow.appendChild(th);
  });

  const thDelete = document.createElement('th');
  thDelete.textContent = '';
  headerRow.appendChild(thDelete);

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const catData = data[category];

  if (catData && catData.projects) {
    catData.projects.forEach((proj, projIndex) => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = proj.name || '';
      nameInput.addEventListener('input', () => { proj.name = nameInput.value; });
      nameCell.appendChild(nameInput);
      row.appendChild(nameCell);

      dates.forEach((date, weekIndex) => {
        const valueCell = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'number';
        input.step = '1'; // higher fidelity
        input.value = proj.values[weekIndex] || 0;
        input.addEventListener('input', () => {
          const val = parseFloat(input.value);
          proj.values[weekIndex] = isNaN(val) ? 0 : val;
          updateCategoryChart(category);
          if (category === 'wip' || category === 'pipeline') updateProjectChart();
          updateCharts();
        });
        valueCell.appendChild(input);
        row.appendChild(valueCell);
      });

      const delCell = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.style.background = '#e74c3c';
      delBtn.style.color = '#fff';
      delBtn.style.border = 'none';
      delBtn.style.borderRadius = '4px';
      delBtn.style.padding = '0.2rem 0.5rem';
      delBtn.style.cursor = 'pointer';
      delBtn.addEventListener('click', () => {
        catData.projects.splice(projIndex, 1);
        renderTable(category);
        updateCategoryChart(category);
        if (category === 'wip' || category === 'pipeline') updateProjectChart();
        updateCharts();
      });
      delCell.appendChild(delBtn);
      row.appendChild(delCell);

      tbody.appendChild(row);
    });
  }

  table.appendChild(tbody);
  container.innerHTML = '';
  container.appendChild(table);
}

function renderCategoryChart(category) {
  const cfg = categoryConfig[category];
  const canvas = document.getElementById(cfg?.chartId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [{
        label: cfg.label,
        data: getAggregatedValues(category),
        backgroundColor: cfg.colour
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: `Weekly ${cfg.label} Values`, color: '#25365C', font: { size: 16, weight: 600 } },
        legend: { display: false },
        tooltip: { callbacks: { label: (context) => `$${(context.parsed.y || 0).toLocaleString()}` } }
      },
      scales: {
        x: { title: { display: true, text: 'Week Ending', color: '#25365C', font: { size: 13, weight: 600 } },
            ticks: { color: '#6B7280', font: { size: 11 } }, grid: { color: '#F3F4F6' } },
        y: { title: { display: true, text: 'Value (USD)', color: '#25365C', font: { size: 12, weight: 600 } },
            ticks: { color: '#6B7280', callback: (v) => '$' + v.toLocaleString(), font: { size: 11 } }, grid: { color: '#F3F4F6' } }
      }
    }
  });
  categoryCharts[category] = chart;
}

function updateCategoryChart(category) {
  const chart = categoryCharts[category];
  if (!chart) return;
  if (category === 'wip') {
    const includePipeline = document.getElementById('includePipeline');
    const wipAgg = getAggregatedValues('wip');
    const pipelineAgg = getAggregatedValues('pipeline');
    const aggregated = [];
    for (let i = 0; i < dates.length; i++) {
      aggregated[i] = (includePipeline && includePipeline.checked) ? (wipAgg[i] || 0) + (pipelineAgg[i] || 0) : (wipAgg[i] || 0);
    }
    chart.data.datasets[0].data = aggregated;
  } else {
    chart.data.datasets[0].data = getAggregatedValues(category);
  }
  chart.update();
}

// -----------------------------------------------------------------------------
// Dashboard & Project charts
// -----------------------------------------------------------------------------
let componentsChart, endingChart, projectChart;

// Accounts → macro shift helper (unchanged)
const accounts = [
  { name: 'Client A', contract: 30, expected: 45 },
  { name: 'Client B', contract: 30, expected: 30 }
];

function renderAccountsTable() {
  const container = document.getElementById('accountsTable');
  if (!container) return;
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Account','Contract Terms (days)','Expected Terms (days)','Adjustment (weeks)'].forEach((h) => {
    const th = document.createElement('th'); th.textContent = h; headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  accounts.forEach((acc, idx) => {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    const nameInput = document.createElement('input');
    nameInput.type = 'text'; nameInput.value = acc.name || '';
    nameInput.addEventListener('input', () => { accounts[idx].name = nameInput.value; });
    nameCell.appendChild(nameInput); row.appendChild(nameCell);

    const contractCell = document.createElement('td');
    const contractInput = document.createElement('input');
    contractInput.type = 'number'; contractInput.min = '0'; contractInput.value = acc.contract || 0;
    contractInput.addEventListener('input', () => {
      const val = parseFloat(contractInput.value); accounts[idx].contract = isNaN(val) ? 0 : val;
      const weeksDiff = ((accounts[idx].expected || 0) - (accounts[idx].contract || 0)) / 7;
      adjCell.textContent = weeksDiff.toFixed(2); updateMacroShiftFromAccounts();
    });
    contractCell.appendChild(contractInput); row.appendChild(contractCell);

    const expectedCell = document.createElement('td');
    const expectedInput = document.createElement('input');
    expectedInput.type = 'number'; expectedInput.min = '0'; expectedInput.value = acc.expected || 0;
    expectedInput.addEventListener('input', () => {
      const val = parseFloat(expectedInput.value); accounts[idx].expected = isNaN(val) ? 0 : val;
      const weeksDiff = ((accounts[idx].expected || 0) - (accounts[idx].contract || 0)) / 7;
      adjCell.textContent = weeksDiff.toFixed(2); updateMacroShiftFromAccounts();
    });
    expectedCell.appendChild(expectedInput); row.appendChild(expectedCell);

    const adjCell = document.createElement('td');
    const diffWeeks = ((acc.expected || 0) - (acc.contract || 0)) / 7;
    adjCell.textContent = diffWeeks.toFixed(2);
    row.appendChild(adjCell);

    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  container.innerHTML = ''; container.appendChild(table);
}

function addAccount() { accounts.push({ name: '', contract: 0, expected: 0 }); renderAccountsTable(); updateMacroShiftFromAccounts(); }

function updateMacroShiftFromAccounts() {
  if (!accounts.length) return;
  let sum = 0;
  accounts.forEach((acc) => { sum += ((acc.expected || 0) - (acc.contract || 0)) / 7; });
  let avgWeeks = sum / accounts.length;
  avgWeeks = Math.round(avgWeeks);
  const slider = document.getElementById('macroShift');
  if (slider) {
    const min = parseInt(slider.min, 10), max = parseInt(slider.max, 10);
    avgWeeks = Math.max(min, Math.min(max, avgWeeks));
    slider.value = avgWeeks;
    const macroValEl = document.getElementById('macroShiftValue'); if (macroValEl) macroValEl.textContent = avgWeeks;
    updateCharts();
  }
}

// -----------------------------------------------------------------------------
// Recalc & Charts update (Ending Cash = Beginning + Net + Treasury)
// -----------------------------------------------------------------------------
function updateCharts() {
  const macroVal   = parseInt(document.getElementById('macroShift').value, 10);
  const timingVal  = parseInt(document.getElementById('timingShift').value, 10);
  const expenseVal = parseInt(document.getElementById('expenseShift').value, 10);
  const minCashVal = parseFloat(document.getElementById('minCash').value || 0);
  const beginningCash = parseFloat((document.getElementById('beginningCash')?.value) || 0);

  // Slider labels
  const macroValEl   = document.getElementById('macroShiftValue');   if (macroValEl)   macroValEl.textContent = macroVal;
  const timingValEl  = document.getElementById('timingShiftValue');  if (timingValEl)  timingValEl.textContent = timingVal;
  const expenseValEl = document.getElementById('expenseShiftValue'); if (expenseValEl) expenseValEl.textContent = expenseVal;

  // Scenarios
  const base = computeFlows(macroVal, timingVal, expenseVal);
  const high = computeFlows(macroVal, timingVal - 1, expenseVal + 1);
  const low  = computeFlows(macroVal, timingVal + 1, expenseVal - 1);

  // Treasury moves and cumulative Treasury balance (kept on schedule)
  const treasMoves = getAggregatedValues('treasury');
  const treasShift = shiftCategory(treasMoves, 0, 0, 0);
  const treasCum   = cumulative(0, treasShift);

  // Ending Operating Cash (Beginning + cumulative Net CF)
  const endingOpBase = cumulative(beginningCash, base.total);
  const endingOpHigh = cumulative(beginningCash, high.total);
  const endingOpLow  = cumulative(beginningCash, low.total);

  // Total Ending Cash = Ending Operating + Treasury Balance
  const endingBase = endingOpBase.map((v, i) => v + treasCum[i]);
  const endingHigh = endingOpHigh.map((v, i) => v + treasCum[i]);
  const endingLow  = endingOpLow.map((v, i) => v + treasCum[i]);

  // Components chart (stacked)
  componentsChart.data.datasets.forEach((ds) => {
    switch (ds.label) {
      case 'Project':         ds.data = base.project; break;
      case 'GR (Project)':    ds.data = base.gr; break;
      case 'QuickPay':        ds.data = base.quickpay; break;
      case 'Operating':       ds.data = base.operating; break;
      case 'Financing':       ds.data = base.financing; break;
      case 'Lines of Credit':
      case 'LOC':             ds.data = base.loc; break;
    }
  });
  componentsChart.update();
  buildLegend(componentsChart, 'componentsLegend');

  // Ending cash line chart (Low/Base/High + Min)
  endingChart.data.datasets.forEach((ds) => {
    if (ds.label === 'Low Scenario')      ds.data = endingLow;
    else if (ds.label === 'Base Forecast') ds.data = endingBase;
    else if (ds.label === 'High Scenario') ds.data = endingHigh;
    else if (ds.label === 'Min Cash Target') ds.data = new Array(dates.length).fill(minCashVal);
  });

  // Safe shaded fill: have High fill to Low by label (not by index)
  const lowIdx  = endingChart.data.datasets.findIndex(d => d.label === 'Low Scenario');
  const highIdx = endingChart.data.datasets.findIndex(d => d.label === 'High Scenario');
  if (lowIdx !== -1 && highIdx !== -1) {
    endingChart.data.datasets[highIdx].fill = {
      target: lowIdx,
      above: 'rgba(0, 191, 166, 0.15)',
      below: 'rgba(0, 191, 166, 0.15)'
    };
  }

  endingChart.update();
  buildLegend(endingChart, 'endingLegend');
}

function updateProjectChart() {
  const n = dates.length;
  const wipAgg      = getAggregatedValues('wip');
  const pipelineAgg = getAggregatedValues('pipeline');
  const projectFlows = new Array(n).fill(0);
  for (let i = 0; i < n; i++) projectFlows[i] = (wipAgg[i] || 0) + (pipelineAgg[i] || 0);
  projectChart.data.datasets[0].data = projectFlows;
  projectChart.update();
}

// -----------------------------------------------------------------------------
// DOM init
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Nav
  const navButtons = document.querySelectorAll('nav button');
  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => { const id = btn.getAttribute('data-section'); showSection(id); });
  });

  // Components (stacked)
  const ctxComponents = document.getElementById('componentsChart').getContext('2d');
  componentsChart = new Chart(ctxComponents, {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [
        { label: 'Project',        data: new Array(dates.length).fill(0), backgroundColor: 'rgba(54, 94, 255, 0.7)',  stack: 'cash' },
        { label: 'GR (Project)',    data: new Array(dates.length).fill(0), backgroundColor: 'rgba(142, 68, 173, 0.7)', stack: 'cash' },
        { label: 'QuickPay',        data: new Array(dates.length).fill(0), backgroundColor: 'rgba(0, 191, 166, 0.7)',  stack: 'cash' },
        { label: 'Operating',       data: new Array(dates.length).fill(0), backgroundColor: 'rgba(255, 183, 77, 0.7)', stack: 'cash' },
        { label: 'Financing',       data: new Array(dates.length).fill(0), backgroundColor: 'rgba(255, 111, 97, 0.7)', stack: 'cash' },
        { label: 'Lines of Credit', data: new Array(dates.length).fill(0), backgroundColor: 'rgba(247, 209, 84, 0.7)', stack: 'cash' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: { display: true, text: 'Weekly Cash Flow Components', color: '#25365C', font: { size: 18, weight: 700 } },
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: $${(ctx.parsed.y || 0).toLocaleString()}` } }
      },
      scales: {
        x: { stacked: true, title: { display: true, text: 'Week Ending', color: '#25365C', font: { size: 14, weight: 600 } },
             ticks: { color: '#6B7280', font: { size: 11 }, autoSkip: true, maxRotation: 0, minRotation: 0 }, grid: { color: '#F3F4F6' } },
        y: { stacked: true, title: { display: true, text: 'Cash Flow (USD)', color: '#25365C', font: { size: 14, weight: 600 } },
             ticks: { color: '#6B7280', callback: (v) => '$' + v.toLocaleString(), font: { size: 11 } }, grid: { color: '#F3F4F6' } }
      }
    }
  });
  buildLegend(componentsChart, 'componentsLegend');

  // Ending cash (lines)
  const ctxEnding = document.getElementById('endingCashChart').getContext('2d');
  endingChart = new Chart(ctxEnding, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        { label: 'Low Scenario',  data: new Array(dates.length).fill(0), borderColor: 'rgba(255, 111, 97, 0.8)', backgroundColor: 'rgba(255, 111, 97, 0.1)', tension: 0.3, fill: false, pointRadius: 2 },
        { label: 'Base Forecast', data: new Array(dates.length).fill(0), borderColor: 'rgba(54, 94, 255, 1)',   backgroundColor: 'rgba(54, 94, 255, 0.1)',  tension: 0.3, fill: false, pointRadius: 3 },
        { label: 'High Scenario', data: new Array(dates.length).fill(0), borderColor: 'rgba(0, 191, 166, 0.8)', backgroundColor: 'rgba(0, 191, 166, 0.1)', tension: 0.3, fill: false, pointRadius: 2 },
        { label: 'Min Cash Target', data: new Array(dates.length).fill(0), borderColor: 'rgba(142, 68, 173, 1)', borderDash: [5, 5], fill: false, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: 'Projected Ending Cash Balance (Low/Base/High)', color: '#25365C', font: { size: 18, weight: 700 } },
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: $${(ctx.parsed.y || 0).toLocaleString()}` } }
      },
      scales: {
        x: { title: { display: true, text: 'Week Ending', color: '#25365C', font: { size: 14, weight: 600 } },
             ticks: { color: '#6B7280', font: { size: 11 }, autoSkip: true, maxRotation: 0, minRotation: 0 }, grid: { color: '#F3F4F6' } },
        y: { title: { display: true, text: 'Cash Balance (USD)', color: '#25365C', font: { size: 14, weight: 600 } },
             ticks: { color: '#6B7280', callback: (v) => '$' + v.toLocaleString(), font: { size: 11 } }, grid: { color: '#F3F4F6' } }
      }
    }
  });
  buildLegend(endingChart, 'endingLegend');

  // Project flows (WIP + Pipeline)
  const ctxProject = document.getElementById('projectChart').getContext('2d');
  projectChart = new Chart(ctxProject, {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [ { label: 'Project Cash Flow (WIP + Pipeline)', data: new Array(dates.length).fill(0), backgroundColor: 'rgba(54, 94, 255, 0.7)' } ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Weekly Project Cash Flow', color: '#25365C', font: { size: 18, weight: 700 } },
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `$${(ctx.parsed.y || 0).toLocaleString()}` } }
      },
      scales: {
        x: { title: { display: true, text: 'Week Ending', color: '#25365C', font: { size: 14, weight: 600 } }, ticks: { color: '#6B7280', font: { size: 11 } }, grid: { color: '#F3F4F6' } },
        y: { title: { display: true, text: 'Cash Flow (USD)', color: '#25365C', font: { size: 14, weight: 600 } }, ticks: { color: '#6B7280', callback: (v) => '$' + v.toLocaleString(), font: { size: 11 } }, grid: { color: '#F3F4F6' } }
      }
    }
  });

  // Render tables & per-category mini charts (if containers exist)
  Object.keys(categoryConfig).forEach((cat) => { renderTable(cat); renderCategoryChart(cat); });
  updateCategoryChart('wip');

  // Accounts table
  renderAccountsTable();
  const addBtn = document.getElementById('addAccountBtn'); if (addBtn) addBtn.addEventListener('click', addAccount);

  // Compute initial macro shift from accounts
  updateMacroShiftFromAccounts();

  // IncludePipeline checkbox
  const includePipelineBox = document.getElementById('includePipeline');
  if (includePipelineBox) includePipelineBox.addEventListener('change', () => updateCategoryChart('wip'));

  // Add-project buttons (bind only if present)
  const byId = (id) => document.getElementById(id);
  const bindAdd = (id, cat) => { const el = byId(id); if (el) el.addEventListener('click', () => addProject(cat)); };
  bindAdd('addWipProjectBtn', 'wip');
  bindAdd('addPipelineProjectBtn', 'pipeline');
  bindAdd('addQuickpayProjectBtn', 'quickpay');
  bindAdd('addOperatingProjectBtn', 'operating');
  bindAdd('addFinancingProjectBtn', 'financing');
  bindAdd('addLocProjectBtn', 'loc');

  // Control bindings
  byId('macroShift')?.addEventListener('input', updateCharts);
  byId('timingShift')?.addEventListener('input', updateCharts);
  byId('expenseShift')?.addEventListener('input', updateCharts);
  byId('minCash')?.addEventListener('input', updateCharts);
  byId('beginningCash')?.addEventListener('input', updateCharts);

  // Initial draw
  updateCharts();
  updateProjectChart();
});

function showSection(id) {
  const navButtons = document.querySelectorAll('nav button');
  navButtons.forEach((btn) => {
    if (btn.getAttribute('data-section') === id) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  const sections = document.querySelectorAll('.section');
  sections.forEach((sec) => {
    if (sec.id === id) sec.classList.add('active'); else sec.classList.remove('active');
  });
  if (id === 'project') updateProjectChart();
}