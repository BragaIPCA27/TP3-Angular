/**
 * Technical indicator mathematics — pure functions only.
 * No Angular, no UI, no side effects.
 */

export interface PricePoint {
  x: number;
  y: number;
}

export interface NullablePricePoint {
  x: number;
  y: number | null;
}

/**
 * Simple Moving Average.
 * Returns null for points with insufficient history (index < period − 1).
 *
 * @param data   Array of price points ordered oldest → newest.
 * @param period Rolling window size.
 */
export function sma(
  data: ReadonlyArray<PricePoint>,
  period: number,
): NullablePricePoint[] {
  if (period < 1) return data.map(p => ({ x: p.x, y: null }));
  return data.map((_, i) => ({
    x: data[i].x,
    y:
      i < period - 1
        ? null
        : data.slice(i - period + 1, i + 1).reduce((s, p) => s + p.y, 0) /
          period,
  }));
}

/**
 * Exponential Moving Average.
 *   k = 2 / (period + 1)
 *   EMA_t = price_t × k + EMA_{t-1} × (1 − k)
 *
 * Seed: SMA of the first `period` points.
 * Returns null for points before the seed is complete.
 *
 * @param data   Array of price points ordered oldest → newest.
 * @param period Rolling window size.
 */
export function ema(
  data: ReadonlyArray<PricePoint>,
  period: number,
): NullablePricePoint[] {
  if (period < 1 || data.length === 0) return data.map(p => ({ x: p.x, y: null }));
  const k = 2 / (period + 1);
  let emaVal = 0;

  return data.map((p, i) => {
    if (i < period - 1) return { x: p.x, y: null };
    if (i === period - 1) {
      emaVal = data.slice(0, period).reduce((s, d) => s + d.y, 0) / period;
    } else {
      emaVal = p.y * k + emaVal * (1 - k);
    }
    return { x: p.x, y: +emaVal.toFixed(4) };
  });
}
