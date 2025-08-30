import { calculatePoints, totalPoints } from "../public/src/lib/rewards.js";

describe("Rewards calculation", () => {
  test("whole dollars: $120 => 90 pts", () => {
    expect(calculatePoints(120)).toBe(90);
  });

  test("between $50 and $100: $75 => 25 pts", () => {
    expect(calculatePoints(75)).toBe(25);
  });

  test("below $50: $49 => 0 pts", () => {
    expect(calculatePoints(49)).toBe(0);
  });

  test("fractional dollars floors: $120.99 => still 90 pts", () => {
    expect(calculatePoints(120.99)).toBe(90);
  });

  test("null/undefined safely => 0", () => {
    expect(calculatePoints(null)).toBe(0);
    expect(calculatePoints(undefined)).toBe(0);
  });

  test("sum of multiple tx", () => {
    const txs = [{ amount: 120 }, { amount: 75 }, { amount: 40 }];
    expect(totalPoints(txs)).toBe(90 + 25 + 0);
  });
});
