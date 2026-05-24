/**
 * Return and growth mathematics — pure functions only.
 * No Angular, no UI, no side effects.
 */

/**
 * Simple (holding period) return.
 *   r = (end - start) / start
 * Returns 0 when startValue is 0.
 */
export function simpleReturn(endValue: number, startValue: number): number {
  if (startValue === 0) return 0;
  return (endValue - startValue) / startValue;
}

/**
 * Compound Annual Growth Rate.
 *   CAGR = (endValue / startValue)^(1/years) − 1   (expressed as %)
 *
 * Returns null when:
 *   - startValue ≤ 0 (can't anchor to a non-positive base)
 *   - years < 0.01  (< 3.65 days — insufficient data for meaningful annualisation)
 *   - either value is non-finite
 */
export function cagr(
  endValue: number,
  startValue: number,
  years: number,
): number | null {
  if (
    startValue <= 0 ||
    years < 0.01 ||
    !isFinite(endValue) ||
    !isFinite(startValue)
  ) {
    return null;
  }
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

/**
 * Years elapsed from a timestamp to now.
 * Accepts ISO string or Unix milliseconds.
 * Returns 0 if parsing fails.
 */
export function yearsElapsed(timestamp: string | number): number {
  const ms =
    typeof timestamp === 'string'
      ? new Date(timestamp).getTime()
      : timestamp;
  if (!isFinite(ms)) return 0;
  return (Date.now() - ms) / (365.25 * 24 * 3_600_000);
}

/**
 * Cumulative return of a price series.
 *   r = (last / first − 1) × 100   (expressed as %)
 * Returns null for series with < 2 points or a zero first price.
 */
export function cumulativeReturn(prices: ReadonlyArray<number>): number | null {
  if (prices.length < 2 || prices[0] === 0) return null;
  return ((prices[prices.length - 1] / prices[0]) - 1) * 100;
}

/**
 * Daily return between two consecutive closes.
 *   r = (today / yesterday − 1) × 100   (expressed as %)
 * Returns 0 when previousClose is 0.
 */
export function dailyReturn(todayClose: number, previousClose: number): number {
  if (previousClose === 0) return 0;
  return ((todayClose / previousClose) - 1) * 100;
}
