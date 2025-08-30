import { calculatePoints } from "../lib/rewards.js";
import { toMonthKey, monthLabel, lastNMonthKeys } from "../lib/grouping.js";
import { state } from "../store/state.js";
import { logEvent, LOG_EVENTS } from "../lib/logger.js";
import { YEARS, PAGE_SIZE } from "../constants.js";

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
    render();
  };

  // Customer
  const csel = document.getElementById("customerSelect");
  csel.onchange = () => {
    state.selectedCustomer = csel.value;
    logEvent(LOG_EVENTS.SELECT_CUSTOMER, { customerId: state.selectedCustomer });
    render();
  };
}

export function render() {
  document.getElementById("loading").hidden = !state.ui.loading;
  const errEl = document.getElementById("error");
  errEl.hidden = !state.ui.error;
  errEl.textContent = state.ui.error || "";

  renderCustomers();
  renderCustomerOptions();
  renderTransactionsAndSummary();
}

function renderTransactionsAndSummary() {
  const tbody = document.getElementById("txnBody");
  const noData = document.getElementById("noData");
  const summary = document.getElementById("pointsSummary");

  const allForCustomer = state.transactions.filter(t => t.customerId === state.selectedCustomer);

  if (state.filter.months === "LAST_3") {
    // Points per month for last 3 months + grand total
    const keys = lastNMonthKeys(3);
    const bucket = new Map(keys.map(k => [k, 0]));

    for (const t of allForCustomer) {
      const { key } = toMonthKey(t.date);
      if (bucket.has(key)) {
        bucket.set(key, bucket.get(key) + calculatePoints(t.amount));
      }
    }

    const rows = keys.map(k => {
      const pts = bucket.get(k) || 0;
      return `<tr><td>${monthLabel(k)}</td><td>${pts}</td></tr>`;
    }).join("");

    const total = [...bucket.values()].reduce((a,b)=>a+b,0);

    summary.innerHTML = `
      <h3>Last 3 Months</h3>
      <table>
        <thead><tr><th>Month</th><th>Points</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:8px"><strong>Total Points:</strong> ${total}</div>
    `;

    tbody.innerHTML = "";
    const any = [...bucket.values()].some(v => v > 0);
    noData.hidden = any;
    return;
  }

  // Specific month selected -> list transactions & total
  const tx = allForCustomer.filter(t => monthFilter(t.date));

  if (!tx.length) {
    tbody.innerHTML = "";
    noData.hidden = false;
    summary.innerHTML = "";
    return;
  }
  noData.hidden = true;

  const rows = tx.map(t => {
    const pts = calculatePoints(t.amount);
    return `<tr><td>${t.date}</td><td>${t.transactionId}</td><td>$${t.amount.toFixed(2)}</td><td>${pts}</td></tr>`;
  }).join("");
  tbody.innerHTML = rows;

  const total = tx.reduce((a, t) => a + calculatePoints(t.amount), 0);
  summary.innerHTML = `<strong>Total Points:</strong> ${total}`;
}

function monthFilter(dateStr) {
  const { year, month } = toMonthKey(dateStr);
  if (year !== state.filter.year) return false;
  if (state.filter.months === "LAST_3") {
    const now = new Date();
    const keyNow = now.getFullYear() * 12 + (now.getMonth() + 1);
    const keyTx  = year * 12 + month;
    return keyNow - keyTx >= 0 && keyNow - keyTx < 3;
  }
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

  // build options
  csel.innerHTML = list.map(c => `<option value="${c}">${c}</option>`).join("");

  // pick default if none or if previous selection no longer exists
  if (!state.selectedCustomer || !list.includes(state.selectedCustomer)) {
    state.selectedCustomer = list[0];
  }

  // sync UI
  csel.value = state.selectedCustomer;
}

