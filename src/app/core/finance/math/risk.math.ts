/**
 * Risk and portfolio-health mathematics — pure functions only.
 * No Angular, no UI, no side effects.
 */

/**
 * Herfindahl-Hirschman Index — measures concentration.
 *   HHI = Σ (weight_i / 100)²
 *   Range: 0 (fully diversified) → 1 (single-position)
 *
 * @param weights Position weights in percent (e.g. [30, 20, 50])
 */
export function hhi(weights: ReadonlyArray<number>): number {
  return weights.reduce((s, w) => s + Math.pow(w / 100, 2), 0);
}

/**
 * Diversification score derived from HHI.
 *   score = (1 − HHI) × 100
 *   Range: 0% (fully concentrated) → ~100% (evenly spread)
 */
export function diversificationScore(weights: ReadonlyArray<number>): number {
  return (1 - hhi(weights)) * 100;
}

/** Highest single-position weight — principal concentration risk signal. */
export function maxConcentration(weights: ReadonlyArray<number>): number {
  return weights.length === 0 ? 0 : Math.max(...weights);
}

/**
 * Win rate: percentage of positions with positive unrealized P&L.
 * @param profitLossValues One value per position.
 */
export function winRate(profitLossValues: ReadonlyArray<number>): number {
  if (profitLossValues.length === 0) return 0;
  const winners = profitLossValues.filter(v => v > 0).length;
  return (winners / profitLossValues.length) * 100;
}

/**
 * Composite portfolio health score (0–100).
 * Weighting: 40% win-rate + 40% diversification + 20% P&L sign.
 *
 * @param winRatePct    0–100
 * @param divScore      0–100
 * @param isProfitable  Whether total portfolio P&L ≥ 0
 */
export function portfolioHealthScore(
  winRatePct: number,
  divScore: number,
  isProfitable: boolean,
): number {
  const plSign = isProfitable ? 100 : 40;
  return Math.round(winRatePct * 0.4 + divScore * 0.4 + plSign * 0.2);
}

/**
 * Portfolio volatility: market-value-weighted standard deviation of
 * daily position returns.
 *
 * @param positions Array of { weight (%), dailyReturnPercent (%) }
 * Returns null when fewer than 2 positions or total weight is 0.
 */
export function portfolioVolatility(
  positions: ReadonlyArray<{ weight: number; dailyReturnPercent: number }>,
): number | null {
  if (positions.length < 2) return null;
  const totalWeight = positions.reduce((s, p) => s + p.weight, 0);
  if (totalWeight === 0) return null;

  const w = positions.map(p => p.weight / totalWeight);
  const mean = positions.reduce((s, p, i) => s + w[i] * p.dailyReturnPercent, 0);
  const variance = positions.reduce(
    (s, p, i) => s + w[i] * Math.pow(p.dailyReturnPercent - mean, 2),
    0,
  );
  return Math.sqrt(variance);
}

/**
 * Maximum drawdown from peak over a value series.
 *   MDD = max[ (peak − trough) / peak ] × 100
 * Returns 0 for series with fewer than 2 points.
 * Return value is positive (e.g. 15 means 15% drawdown).
 */
export function maxDrawdown(values: ReadonlyArray<number>): number {
  if (values.length < 2) return 0;
  let peak = values[0];
  let maxDD = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = ((peak - v) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return maxDD;
}
