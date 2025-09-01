/**
 * Unit tests for Retailer Rewards (Jest, ESM).
 * Covers:
 *  - Reward formula (positive & negative cases, whole & fractional)
 *  - Month bucketing & "last 3 months" summary anchored to newest txn
 */

import { calculatePoints } from "../public/src/lib/rewards.js";
import { toMonthKey, monthLabel } from "../public/src/lib/grouping.js";

/** Helper: last N month keys from a reference date (YYYY-MM, newest first). */
function lastNKeysFromRef(n, refDate) {
  const keys = [];
  let y = refDate.getFullYear();
  let m = refDate.getMonth() + 1; // 1..12
  for (let i = 0; i < n; i++) {
    const mm = String(m).padStart(2, "0");
    keys.push(`${y}-${mm}`);
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  return keys;
}

/* --------------------------
 * Reward formula – POSITIVE cases
 * -------------------------- */
describe("calculatePoints – positive (expected-to-earn) cases", () => {
  test("Whole-dollar boundaries: $50 → 0, $100 → 50, $120 → 90, $150 → 150", () => {
    expect(calculatePoints(50)).toBe(0);    // ≤$50 earns 0
    expect(calculatePoints(100)).toBe(50);  // 1*50
    expect(calculatePoints(120)).toBe(90);  // 2*(20) + 1*50
    expect(calculatePoints(150)).toBe(150); // 2*(50) + 1*50
  });

  test("Fractional amounts are floored: 99.99→49, 100.75→50, 101.01→52", () => {
    expect(calculatePoints(99.99)).toBe(49);   // floor(99.99)=99 -> 49
    expect(calculatePoints(100.75)).toBe(50);  // floor(100.75)=100 -> 50
    expect(calculatePoints(101.01)).toBe(52);  // floor(101.01)=101 -> 52
  });

  test('Numeric string is accepted via Number(): "120" → 90', () => {
    // Implementation uses Number(amount), keeping this robust in UI paths.
    expect(calculatePoints("120")).toBe(90);
  });
});

/* --------------------------
 * Reward formula – NEGATIVE/edge cases
 * -------------------------- */
describe("calculatePoints – negative/edge cases (should not earn)", () => {
  test("< $50 and tiny positives: 49.99 → 0, 0 → 0", () => {
    expect(calculatePoints(49.99)).toBe(0);
    expect(calculatePoints(0)).toBe(0);
  });

  test("Invalid/empty values: null, undefined, NaN → 0", () => {
    // Implementation does Number(amount) || 0, so all should coerce to 0 points.
    expect(calculatePoints(null)).toBe(0);
    expect(calculatePoints(undefined)).toBe(0);
    expect(calculatePoints(NaN)).toBe(0);
  });

  test("Negative amounts: -10 → 0 (guarded to non-negative points)", () => {
    expect(calculatePoints(-10)).toBe(0);
  });
});

/* --------------------------
 * App logic – month bucketing & last-3-months
 * -------------------------- */
describe("App logic – last 3 months & month view", () => {
  // Small, controlled dataset for one customer
  const CUST = "C001";
  const tx = [
    { customerId: CUST, transactionId: "T1", amount: 99.23,  date: "2025-08-17" }, // 49 pts
    { customerId: CUST, transactionId: "T2", amount: 120.00, date: "2025-07-05" }, // 90 pts
    { customerId: CUST, transactionId: "T3", amount: 45.00,  date: "2025-06-10" }, // 0 pts
    { customerId: CUST, transactionId: "T4", amount: 150.00, date: "2025-06-20" }, // 150 pts
    { customerId: CUST, transactionId: "T5", amount: 200.00, date: "2024-12-01" }, // outside last-3 window
  ];

  test("Last 3 months summary is anchored to newest txn and totals per month are correct", () => {
    const mine = tx.filter(t => t.customerId === CUST);
    const newestDate = new Date(Math.max(...mine.map(t => new Date(t.date).getTime())));
    const keys = lastNKeysFromRef(3, newestDate); // ["2025-08","2025-07","2025-06"]

    const bucket = new Map(keys.map(k => [k, 0]));
    for (const t of mine) {
      const { key } = toMonthKey(t.date);
      if (bucket.has(key)) bucket.set(key, bucket.get(key) + calculatePoints(t.amount));
    }

    expect(bucket.get("2025-08")).toBe(49);
    expect(bucket.get("2025-07")).toBe(90);
    // June has two tx: $45 -> 0, $150 -> 150
    expect(bucket.get("2025-06")).toBe(150);

    const total = [...bucket.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(49 + 90 + 150);

    // Label sanity (locale-dependent month name)
    expect(monthLabel("2025-08")).toMatch(/Aug/i);
  });

  test("Specific month view shows per-transaction points and correct total (June 2025)", () => {
    const month = 6, year = 2025;
    const juneTx = tx.filter(t => {
      const { year: y, month: m } = toMonthKey(t.date);
      return y === year && m === month;
    });

    const pts = juneTx.map(t => calculatePoints(t.amount));
    expect(pts).toEqual([0, 150]);

    const total = pts.reduce((a, b) => a + b, 0);
    expect(total).toBe(150);
  });

  test("No transactions for a month returns empty set and zero total (May 2025)", () => {
    const month = 5, year = 2025;
    const mayTx = tx.filter(t => {
      const { year: y, month: m } = toMonthKey(t.date);
      return y === year && m === month;
    });

    expect(mayTx).toHaveLength(0);
    const total = mayTx.reduce((a, t) => a + calculatePoints(t.amount), 0);
    expect(total).toBe(0);
  });
});