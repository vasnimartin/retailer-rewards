/** Parse a date string and return { year, month, key: "YYYY-MM" } */
export function toMonthKey(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const key = `${year}-${String(month).padStart(2, "0")}`;
  return { year, month, key };
}

/** Format "YYYY-MM" to "Mon YYYY", e.g. "2025-08" -> "Aug 2025" */
export function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, {
    month: "short",
    year: "numeric"
  });
}

/** Get the last N month keys, newest first, e.g. ["2025-08","2025-07","2025-06"] */
export function lastNMonthKeys(n) {
  const now = new Date();
  const list = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    list.push(key);
  }
  return list;
}

// Build 3 months based on the most recent transaction across all years
export function getLastNMonthsGlobal(transactions, n = 3) {
  if (!transactions?.length) return [];
  const maxTime = Math.max(...transactions.map(t => new Date(t.date).getTime()));
  const anchor = new Date(maxTime);
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);

  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() - i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() }); // month 0..11
  }
  return out.reverse();
}

// Build up to 3 months strictly within a given year (does NOT cross the year)
export function getLastNMonthsInYear(transactions, year, n = 3) {
  const inYear = (transactions || []).filter(t => new Date(t.date).getFullYear() === year);

  const anchorMonth = inYear.length
    ? Math.max(...inYear.map(t => new Date(t.date).getMonth()))
    : 11; // Dec (0-based)

  const months = [];
  for (let i = 0; i < n; i++) {
    const m = anchorMonth - i;
    if (m < 0) break;            // stay within the year
    months.push({ year, month: m });
  }
  return months.reverse();
}

// Utility to get all transactions + points for a specific {year, month}
// Uses your existing reward calc function if you pass it in.
export function summarizeMonth(transactions, year, month, calcPointsFn) {
  const monthTx = (transactions || []).filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const rows = monthTx.map(t => ({
    ...t,
    points: calcPointsFn ? calcPointsFn(t.amount) : 0,
  }));
  const total = rows.reduce((s, r) => s + r.points, 0);
  return { rows, total };
}