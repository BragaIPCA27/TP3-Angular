import { ema, sma } from './indicators.math';
import type { PricePoint } from './indicators.math';

/** Helper to build sequential price points. */
function pts(prices: number[]): PricePoint[] {
  return prices.map((y, i) => ({ x: i + 1, y }));
}

describe('indicators.math', () => {

  // ── sma ────────────────────────────────────────────────────────
  describe('sma', () => {
    it('returns all-null for a series shorter than the period', () => {
      const result = sma(pts([100, 110]), 5);
      expect(result.every(p => p.y === null)).toBeTrue();
    });

    it('returns all-null for period < 1', () => {
      const result = sma(pts([100, 110, 120]), 0);
      expect(result.every(p => p.y === null)).toBeTrue();
    });

    it('computes SMA-3 correctly', () => {
      // prices: 100, 110, 120, 130
      // SMA3:   null, null, 110, 120
      const result = sma(pts([100, 110, 120, 130]), 3);
      expect(result[0].y).toBeNull();
      expect(result[1].y).toBeNull();
      expect(result[2].y).toBeCloseTo(110, 5);  // (100+110+120)/3
      expect(result[3].y).toBeCloseTo(120, 5);  // (110+120+130)/3
    });

    it('SMA-1 equals the price itself', () => {
      const data = pts([100, 200, 300]);
      const result = sma(data, 1);
      result.forEach((p, i) => expect(p.y).toBeCloseTo(data[i].y, 5));
    });

    it('preserves x coordinates', () => {
      const data = pts([100, 110, 120]);
      const result = sma(data, 2);
      expect(result.map(p => p.x)).toEqual([1, 2, 3]);
    });

    it('returns empty array for empty input', () => {
      expect(sma([], 3)).toEqual([]);
    });
  });

  // ── ema ────────────────────────────────────────────────────────
  describe('ema', () => {
    it('returns all-null for a series shorter than the period', () => {
      const result = ema(pts([100, 110]), 5);
      expect(result.every(p => p.y === null)).toBeTrue();
    });

    it('returns all-null for period < 1', () => {
      const result = ema(pts([100, 110, 120]), 0);
      expect(result.every(p => p.y === null)).toBeTrue();
    });

    it('seeds with SMA for the first period points', () => {
      // EMA-3 seed = SMA of first 3 = (100+110+120)/3 = 110
      const result = ema(pts([100, 110, 120, 130]), 3);
      expect(result[0].y).toBeNull();
      expect(result[1].y).toBeNull();
      expect(result[2].y).toBeCloseTo(110, 4);
    });

    it('applies exponential weighting after seed', () => {
      // EMA-3: k = 2/(3+1) = 0.5
      // seed (i=2) = 110
      // i=3: 130 × 0.5 + 110 × 0.5 = 120
      const result = ema(pts([100, 110, 120, 130]), 3);
      expect(result[3].y).toBeCloseTo(120, 4);
    });

    it('EMA-1 equals the price itself', () => {
      const data = pts([100, 200, 300]);
      const result = ema(data, 1);
      result.forEach((p, i) => expect(p.y).toBeCloseTo(data[i].y, 4));
    });

    it('preserves x coordinates', () => {
      const data = pts([100, 110, 120, 130]);
      const result = ema(data, 2);
      expect(result.map(p => p.x)).toEqual([1, 2, 3, 4]);
    });

    it('EMA reacts faster to price moves than SMA', () => {
      // Spike at the end: EMA should be closer to spike than SMA
      const prices = [100, 100, 100, 100, 200];
      const data = pts(prices);
      const smaResult = sma(data, 3);
      const emaResult = ema(data, 3);
      const lastSMA = smaResult[4].y!;
      const lastEMA = emaResult[4].y!;
      // EMA should be higher (closer to 200) than SMA
      expect(lastEMA).toBeGreaterThan(lastSMA);
    });
  });
});
