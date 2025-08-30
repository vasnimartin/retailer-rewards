import { calculatePoints } from "../public/src/lib/rewards.js";
import { toMonthKey, monthLabel } from "../public/src/lib/grouping.js";

// Small, controlled dataset for one customer
const CUST = "C001";
const tx = [
  { customerId: CUST, transactionId: "T1", amount: 99.23,  date: "2025-08-17" }, // 49 pts
  { customerId: CUST, transactionId: "T2", amount: 120.00, date: "2025-07-05" }, // 90 pts
  { customerId: CUST, transactionId: "T3", amount: 45.00,  date: "2025-06-10" }, // 0 pts
  { customerId: CUST, transactionId: "T4", amount: 150.00, date: "2025-06-20" }, // 150 pts
  { customerId: CUST, transactionId: "T5", amount: 200.00, date: "2024-12-01" }, // outside last 3 months window
];

// Helper: last N month keys based on a reference "now" (YYYY-MM)
function lastNKeysFromRef(n, refDate) {
  const keys = [];
  let y = refDate.getFullYear();
  let m = refDate.getMonth() + 1;
  for (let i = 0; i < n; i++) {
    const mm = String(m).padStart(2, "0");
    keys.push(`${y}-${mm}`);
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  return keys;
}

describe("App logic – last 3 months & month view", () => {
  test("Last 3 months summary is anchored to newest tx and totals are correct", () => {
    const mine = tx.filter(t => t.customerId === CUST);
    const newestDate = new Date(Math.max(...mine.map(t => new Date(t.date).getTime())));
    const keys = lastNKeysFromRef(3, newestDate); // ["2025-08","2025-07","2025-06"]

    const bucket = new Map(keys.map(k => [k, 0]));
    for (const t of mine) {
      const { key } = toMonthKey(t.date);
      if (bucket.has(key)) bucket.set(key, bucket.get(key) + calculatePoints(t.amount));
    }

    // Expect per-month points
    expect(bucket.get("2025-08")).toBe(49);
    expect(bucket.get("2025-07")).toBe(90);
    // June has two tx: $45 -> 0, $150 -> 150
    expect(bucket.get("2025-06")).toBe(150);

    // Expect total
    const total = [...bucket.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(49 + 90 + 150);

    // Labels look sane (not strictly required, but nice)
    expect(monthLabel("2025-08")).toMatch(/Aug/i);
  });

  test("Specific month view shows per-transaction points and correct total", () => {
    // Month filter for June 2025
    const month = 6, year = 2025;
    const juneTx = tx.filter(t => {
      const { year: y, month: m } = toMonthKey(t.date);
      return y === year && m === month;
    });

    // Expect the two June transactions in order we provided
    const pts = juneTx.map(t => calculatePoints(t.amount));
    expect(pts).toEqual([0, 150]);

    const total = pts.reduce((a, b) => a + b, 0);
    expect(total).toBe(150);
  });

  test("No transactions month returns empty + zero total", () => {
    const month = 5, year = 2025; // May 2025 -> none in our sample
    const mayTx = tx.filter(t => {
      const { year: y, month: m } = toMonthKey(t.date);
      return y === year && m === month;
    });

    expect(mayTx).toHaveLength(0);
    const total = mayTx.reduce((a, t) => a + calculatePoints(t.amount), 0);
    expect(total).toBe(0);
  });
});