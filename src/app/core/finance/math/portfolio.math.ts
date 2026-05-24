/**
 * Core portfolio mathematics — pure functions only.
 * No Angular, no UI, no side effects.
 */

/** Current market value of a position: quantity × current price */
export function marketValue(quantity: number, price: number): number {
  return quantity * price;
}

/** Cost basis of a position: quantity × average purchase price */
export function investedValue(quantity: number, avgCost: number): number {
  return quantity * avgCost;
}

/**
 * Weighted average cost when adding shares to an existing position.
 *   WACC = (existing_qty × existing_avg + new_qty × new_price) / (existing_qty + new_qty)
 */
export function weightedAvgCost(
  existingQty: number,
  existingAvg: number,
  addQty: number,
  addPrice: number,
): number {
  const total = existingQty + addQty;
  if (total === 0) return 0;
  return (existingQty * existingAvg + addQty * addPrice) / total;
}

/**
 * Position weight as percentage of total portfolio market value.
 * Returns 0 if totalMV is 0.
 */
export function allocationWeight(positionMV: number, totalMV: number): number {
  if (totalMV === 0) return 0;
  return (positionMV / totalMV) * 100;
}

/** Sum of market values across all positions. */
export function totalMarketValue(marketValues: ReadonlyArray<number>): number {
  return marketValues.reduce((s, v) => s + v, 0);
}
