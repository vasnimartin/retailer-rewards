// src/ui/render.js
import { calculatePoints } from "../lib/rewards.js";
import { toMonthKey, monthLabel } from "../lib/grouping.js";
import { YEARS, PAGE_SIZE } from "../constants.js";
import { state } from "../store/state.js";
import { logEvent, LOG_EVENTS } from "../lib/logger.js";

// We always respect the selected Year for LAST_3, so keep Year enabled
function syncYearDisabled() {
  const ysel = document.getElementById("yearSelect");
  if (!ysel) return;
  ysel.disabled = false;
}

export function initControls() {
  // Year
  const ysel = document.getElementById("yearSelect");
  ysel.innerHTML = YEARS.map(y => `<option value="${y}">${y}</option>`).join("");
  ysel.value = state.filter.year;
  ysel.onchange = () => {
    state.filter.year = Number(ysel.value);
    logEvent(LOG_EVENTS.CHANGE_FILTER, { year: state.filter.year });
    render();
  };

  // Month
  const msel = document.getElementById("monthSelect");
  msel.value = state.filter.months;
  msel.onchange = () => {
    state.filter.months = msel.value;
    logEvent(LOG_EVENTS.CHANGE_FILTER, { months: state.filter.months });
    syncYearDisabled();
    render();
  };

  // Customer
  const csel = document.getElementById("customerSelect");
  csel.onchange = () => {
    state.selectedCustomer = csel.value;
    logEvent(LOG_EVENTS.SELECT_CUSTOMER, { customerId: state.selectedCustomer });
    render();
  };

  syncYearDisabled();
}

export function render() {
  document.getElementById("loading").hidden = !state.ui.loading;
  const errEl = document.getElementById("error");
  errEl.hidden = !state.ui.error;
  errEl.textContent = state.ui.error || "";

  syncYearDisabled();
  renderCustomers();
  renderCustomerOptions();
  renderTransactionsAndSummary();
}

function renderTransactionsAndSummary() {
  const tbody = document.getElementById("txnBody");
  const noData = document.getElementById("noData");
  const summary = document.getElementById("pointsSummary");

  const allForCustomer = state.transactions.filter(
    t => t.customerId === state.selectedCustomer
  );

  // ---------- LAST 3 MONTHS SUMMARY ----------
  if (state.filter.months === "LAST_3") {
    const y = state.filter.year;

    // Find latest month (0..11) in this year that has any tx for this customer
    const inYearDates = allForCustomer
      .map(t => new Date(t.date))
      .filter(d => d.getFullYear() === y);

    if (inYearDates.length === 0) {
      // No activity at all in the selected year
      const html = `
        <h3>Last 3 Months</h3>
        <table>
          <thead><tr><th>Month</th><th>Points</th></tr></thead>
          <tbody></tbody>
        </table>
        <div style="margin-top:8px"><strong>Total Points:</strong> 0</div>
      `;
      summary.innerHTML = html;
      tbody.innerHTML = "";
      noData.hidden = false; // "No transactions"
      return;
    }

    const anchorMonth = Math.max(...inYearDates.map(d => d.getMonth())); // 0..11

    // Build up to 3 months ending at anchor, staying within the same year
    const months = [];
    for (let m = Math.max(0, anchorMonth - 2); m <= anchorMonth; m++) {
      months.push(`${y}-${String(m + 1).padStart(2, "0")}`); // "YYYY-MM"
    }

    const bucket = new Map(months.map(k => [k, 0]));
    const monthSet = new Set(months);
    let txCountInRange = 0;

    // Aggregate points for txns in those months
    for (const t of allForCustomer) {
      const { key, year } = toMonthKey(t.date);
      if (year === y && monthSet.has(key)) {
        txCountInRange++;
        bucket.set(key, bucket.get(key) + calculatePoints(t.amount));
      }
    }

    const rowsHtml = months
      .map(k => `<tr><td>${monthLabel(k)}</td><td>${bucket.get(k) || 0}</td></tr>`)
      .join("");

    const total = [...bucket.values()].reduce((a, b) => a + b, 0);
    const endingLabel = monthLabel(months[months.length - 1]);

    const html = `
      <h3>Last 3 Months (ending ${endingLabel})</h3>
      <table>
        <thead><tr><th>Month</th><th>Points</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div style="margin-top:8px"><strong>Total Points:</strong> ${total}</div>
    `;
    summary.innerHTML = html;

    // Clear the tx table for the summary view
    tbody.innerHTML = "";
    // Show "No transactions" only when there are zero transactions in the window
    noData.hidden = txCountInRange > 0;
    return;
  }

  // ---------- SPECIFIC MONTH VIEW ----------
  const tx = allForCustomer.filter(t => monthFilter(t.date));

  if (!tx.length) {
    tbody.innerHTML = "";
    noData.hidden = false;
    summary.innerHTML = "";
    return;
  }
  noData.hidden = true;

  const rows = tx
    .map(t => {
      const pts = calculatePoints(t.amount);
      return `<tr><td>${t.date}</td><td>${t.transactionId}</td><td>$${t.amount.toFixed(2)}</td><td>${pts}</td></tr>`;
    })
    .join("");

  tbody.innerHTML = rows;

  const total = tx.reduce((a, t) => a + calculatePoints(t.amount), 0);
  summary.innerHTML = `<strong>Total Points:</strong> ${total}`;
}

function monthFilter(dateStr) {
  const { year, month } = toMonthKey(dateStr);
  if (year !== state.filter.year) return false;
  // We never call this for LAST_3 path; this is for fixed month only
  return month === Number(state.filter.months);
}

function renderCustomers() {
  const list = [...new Set(state.transactions.map(t => t.customerId))].sort();
  state.customers = list;

  const start = (state.ui.page - 1) * PAGE_SIZE;
  const pageItems = list.slice(start, start + PAGE_SIZE);

  document.getElementById("custBody").innerHTML =
    pageItems.map((c, i) => `<tr><td>${start + i + 1}</td><td>${c}</td></tr>`).join("");

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  document.getElementById("custPager").innerHTML = `
    <button ${state.ui.page<=1?"disabled":""} id="prev">Prev</button>
    <span>Page ${state.ui.page} / ${totalPages}</span>
    <button ${state.ui.page>=totalPages?"disabled":""} id="next">Next</button>
  `;

  document.getElementById("prev")?.addEventListener("click", () => {
    state.ui.page = Math.max(1, state.ui.page - 1);
    logEvent(LOG_EVENTS.PAGINATE, { page: state.ui.page });
    render();
  });
  document.getElementById("next")?.addEventListener("click", () => {
    state.ui.page = Math.min(totalPages, state.ui.page + 1);
    logEvent(LOG_EVENTS.PAGINATE, { page: state.ui.page });
    render();
  });
}

function renderCustomerOptions() {
  const csel = document.getElementById("customerSelect");
  const list = state.customers;

  if (!list || list.length === 0) {
    csel.innerHTML = "";
    return;
  }

  csel.innerHTML = list.map(c => `<option value="${c}">${c}</option>`).join("");

  if (!state.selectedCustomer || !list.includes(state.selectedCustomer)) {
    state.selectedCustomer = list[0];
  }

  csel.value = state.selectedCustomer;
}
