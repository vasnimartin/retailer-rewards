// public/src/lib/grouping.js
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
