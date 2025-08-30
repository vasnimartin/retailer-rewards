/**
 * Calculate reward points for a single purchase amount.
 * Rules: +2 points per whole dollar over $100, +1 point per whole dollar between $50–$100.
 * Fractions DO NOT count (floor to whole dollars). Example: $120 => 2*20 + 1*50 = 90.
 * @param {number} amount
 * @returns {number}
 */
export function calculatePoints(amount) {
  const dollars = Math.floor(Number(amount) || 0);
  const over100 = Math.max(0, dollars - 100);
  const between50And100 = Math.max(0, Math.min(dollars, 100) - 50);
  return over100 * 2 + between50And100;
}

/**
 * Sum points per transaction list.
 * @param {{amount:number}[]} txs
 * @returns {number}
 */
export function totalPoints(txs) {
  return txs.reduce((acc, t) => acc + calculatePoints(t.amount), 0);
}
