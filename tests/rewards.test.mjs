/**
 * Unit tests for Retailer Rewards (Jest, ESM).
 * Covers:
 *  - Reward formula (positive & negative cases, whole & fractional)
 *  - Month bucketing & "last 3 months" summary anchored to newest month IN THE SELECTED YEAR
 */

import { calculatePoints } from "../public/src/lib/rewards.js";
import { toMonthKey, monthLabel } from "../public/src/lib/grouping.js";

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
    expect(calculatePoints(null)).toBe(0);
    expect(calculatePoints(undefined)).toBe(0);
    expect(calculatePoints(NaN)).toBe(0);
  });

  test("Negative amounts: -10 → 0 (guarded to non-negative points)", () => {
    expect(calculatePoints(-10)).toBe(0);
  });
});

/* --------------------------
 * App logic – last 3 months (within selected year) & month view
 * -------------------------- */
describe("App logic – last 3 months (within selected year) & month view", () => {
  const CUST = "C001";
  // Use UTC **noon** to avoid local-time rollbacks across month boundaries.
  const tx = [
    { customerId: CUST, transactionId: "T1", amount: 99.23,  date: "2025-08-17T12:00:00Z" }, // 49 pts
    { customerId: CUST, transactionId: "T2", amount: 120.00, date: "2025-07-05T12:00:00Z" }, // 90 pts
    { customerId: CUST, transactionId: "T3", amount: 45.00,  date: "2025-06-10T12:00:00Z" }, // 0 pts
    { customerId: CUST, transactionId: "T4", amount: 150.00, date: "2025-06-20T12:00:00Z" }, // 150 pts
    { customerId: CUST, transactionId: "T5", amount: 200.00, date: "2024-12-01T12:00:00Z" }  // different year
  ];

  /** Timezone-safe helper: last 3 consecutive month keys inside selectedYear, ending at latest month with activity. */
  function last3WithinYear(transactions, selectedYear) {
    const monthsInYear = transactions
      .map(t => toMonthKey(t.date))   // {year, month(1..12), key}
      .filter(({ year }) => year === selectedYear)
      .map(({ month }) => month);     // [1..12]

    if (monthsInYear.length === 0) return [];

    const anchor = Math.max(...monthsInYear);   // latest active month number
    const start  = Math.max(1, anchor - 2);     // stay in-year
    const keys = [];
    for (let m = start; m <= anchor; m++) {
      keys.push(`${selectedYear}-${String(m).padStart(2, "0")}`);
    }
    return keys; // ascending order, e.g., ["2025-06","2025-07","2025-08"]
  }

  test("Last 3 months respects selected year (2025): sums per month, correct total, correct labels", () => {
    const selectedYear = 2025;
    const mine = tx.filter(t => t.customerId === CUST);
    const keys = last3WithinYear(mine, selectedYear); // ["2025-06","2025-07","2025-08"]

    const bucket = new Map(keys.map(k => [k, 0]));
    for (const t of mine) {
      const { key } = toMonthKey(t.date);
      if (bucket.has(key)) {
        bucket.set(key, bucket.get(key) + calculatePoints(t.amount));
      }
    }

    expect(keys).toEqual(["2025-06", "2025-07", "2025-08"]);
    expect(bucket.get("2025-08")).toBe(49);
    expect(bucket.get("2025-07")).toBe(90);
    expect(bucket.get("2025-06")).toBe(150);

    const total = [...bucket.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(49 + 90 + 150);

    expect(monthLabel("2025-08")).toMatch(/Aug/i);
  });

  test("Last 3 months respects selected year (2024): window ends Dec 2024 and stays in-year", () => {
    const selectedYear = 2024;
    const mine = tx.filter(t => t.customerId === CUST);
    const keys = last3WithinYear(mine, selectedYear); // ["2024-10","2024-11","2024-12"]

    const bucket = new Map(keys.map(k => [k, 0]));
    for (const t of mine) {
      const { key } = toMonthKey(t.date);
      if (bucket.has(key)) {
        bucket.set(key, bucket.get(key) + calculatePoints(t.amount));
      }
    }

    expect(keys).toEqual(["2024-10", "2024-11", "2024-12"]);
    // Only Dec 2024 has txn: $200 => 2*(200-100)+50 = 250
    expect(bucket.get("2024-12")).toBe(250);
    expect(bucket.get("2024-10")).toBe(0);
    expect(bucket.get("2024-11")).toBe(0);

    const total = [...bucket.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(250);
  });

  test("No activity in selected year returns empty window/zero total (2023)", () => {
    const selectedYear = 2023;
    const mine = tx.filter(t => t.customerId === CUST);
    const keys = last3WithinYear(mine, selectedYear);
    expect(keys).toEqual([]);

    const total = 0;
    expect(total).toBe(0);
  });

  test("Specific month view shows per-transaction points and correct total (June 2025)", () => {
    const month = 6, year = 2025; // June
    const juneTx = tx.filter(t => {
      const { year: y, month: m } = toMonthKey(t.date);
      return y === year && m === month;
    });

    const pts = juneTx.map(t => calculatePoints(t.amount));
    expect(pts).toEqual([0, 150]); // $45 -> 0, $150 -> 150

    const total = pts.reduce((a, b) => a + b, 0);
    expect(total).toBe(150);
  });

  test("No transactions for a month returns empty set and zero total (May 2025)", () => {
    const month = 5, year = 2025; // May
    const mayTx = tx.filter(t => {
      const { year: y, month: m } = toMonthKey(t.date);
      return y === year && m === month;
    });

    expect(mayTx).toHaveLength(0);
    const total = mayTx.reduce((a, t) => a + calculatePoints(t.amount), 0);
    expect(total).toBe(0);
  });
});
