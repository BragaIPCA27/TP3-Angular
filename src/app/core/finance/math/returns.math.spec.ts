import {
  cagr,
  cumulativeReturn,
  dailyReturn,
  simpleReturn,
  yearsElapsed,
} from './returns.math';

describe('returns.math', () => {

  // ── simpleReturn ───────────────────────────────────────────────
  describe('simpleReturn', () => {
    it('computes a 10% gain', () => {
      expect(simpleReturn(110, 100)).toBeCloseTo(0.1, 5);
    });

    it('computes a 20% loss', () => {
      expect(simpleReturn(80, 100)).toBeCloseTo(-0.2, 5);
    });

    it('returns 0 when start value is 0', () => {
      expect(simpleReturn(100, 0)).toBe(0);
    });

    it('returns 0 for no change', () => {
      expect(simpleReturn(100, 100)).toBe(0);
    });
  });

  // ── cagr ───────────────────────────────────────────────────────
  describe('cagr', () => {
    it('returns null for zero start value', () => {
      expect(cagr(110, 0, 1)).toBeNull();
    });

    it('returns null for negative start value', () => {
      expect(cagr(110, -100, 1)).toBeNull();
    });

    it('returns null for years < 0.01', () => {
      expect(cagr(110, 100, 0.005)).toBeNull();
    });

    it('returns null for non-finite end value', () => {
      expect(cagr(Infinity, 100, 1)).toBeNull();
    });

    it('returns 0% when end equals start (1 year)', () => {
      expect(cagr(100, 100, 1)).toBeCloseTo(0, 5);
    });

    it('computes 10% CAGR over 1 year', () => {
      expect(cagr(110, 100, 1)).toBeCloseTo(10, 4);
    });

    it('annualises correctly over 2 years — ~41.4% total = ~18.9% CAGR', () => {
      // sqrt(1.414) - 1 ≈ 18.9%... let's use exact: (200/100)^(1/2) - 1 = 41.42%
      expect(cagr(200, 100, 2)).toBeCloseTo(41.42, 1);
    });

    it('computes negative CAGR when portfolio lost value', () => {
      // 100 → 80 over 1 year = -20% CAGR
      expect(cagr(80, 100, 1)).toBeCloseTo(-20, 4);
    });
  });

  // ── yearsElapsed ───────────────────────────────────────────────
  describe('yearsElapsed', () => {
    it('returns > 0 for a past ISO timestamp', () => {
      const pastDate = new Date(Date.now() - 365 * 24 * 3_600_000).toISOString();
      expect(yearsElapsed(pastDate)).toBeGreaterThan(0.9);
    });

    it('accepts Unix milliseconds', () => {
      const msAgo = Date.now() - 365 * 24 * 3_600_000;
      expect(yearsElapsed(msAgo)).toBeGreaterThan(0.9);
    });

    it('returns 0 for an invalid date string', () => {
      expect(yearsElapsed('not-a-date')).toBe(0);
    });
  });

  // ── cumulativeReturn ───────────────────────────────────────────
  describe('cumulativeReturn', () => {
    it('returns null for fewer than 2 prices', () => {
      expect(cumulativeReturn([100])).toBeNull();
      expect(cumulativeReturn([])).toBeNull();
    });

    it('returns null when first price is 0', () => {
      expect(cumulativeReturn([0, 100])).toBeNull();
    });

    it('computes 50% gain', () => {
      expect(cumulativeReturn([100, 150])).toBeCloseTo(50, 5);
    });

    it('computes 20% loss', () => {
      expect(cumulativeReturn([100, 80])).toBeCloseTo(-20, 5);
    });

    it('uses last price against first in a multi-point series', () => {
      // Intermediate fluctuations must not affect result
      expect(cumulativeReturn([100, 90, 110, 120])).toBeCloseTo(20, 5);
    });
  });

  // ── dailyReturn ────────────────────────────────────────────────
  describe('dailyReturn', () => {
    it('computes 5% daily gain', () => {
      expect(dailyReturn(105, 100)).toBeCloseTo(5, 5);
    });

    it('computes negative daily return', () => {
      expect(dailyReturn(95, 100)).toBeCloseTo(-5, 5);
    });

    it('returns 0 when previous close is 0', () => {
      expect(dailyReturn(100, 0)).toBe(0);
    });
  });
});
