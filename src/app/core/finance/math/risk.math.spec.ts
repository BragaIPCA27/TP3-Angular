import {
  diversificationScore,
  hhi,
  maxConcentration,
  maxDrawdown,
  portfolioHealthScore,
  portfolioVolatility,
  winRate,
} from './risk.math';

describe('risk.math', () => {

  // ── hhi ────────────────────────────────────────────────────────
  describe('hhi', () => {
    it('returns 1 for a fully concentrated single-position portfolio', () => {
      expect(hhi([100])).toBeCloseTo(1, 5);
    });

    it('returns 0.5 for two equal positions', () => {
      // (0.5)² + (0.5)² = 0.5
      expect(hhi([50, 50])).toBeCloseTo(0.5, 5);
    });

    it('returns 0.333... for three equal positions', () => {
      expect(hhi([33.33, 33.33, 33.33])).toBeCloseTo(0.333, 2);
    });

    it('returns 0 for an empty array', () => {
      expect(hhi([])).toBe(0);
    });

    it('increases with concentration', () => {
      expect(hhi([80, 20])).toBeGreaterThan(hhi([50, 50]));
    });
  });

  // ── diversificationScore ───────────────────────────────────────
  describe('diversificationScore', () => {
    it('returns 0% for a single-position portfolio', () => {
      expect(diversificationScore([100])).toBeCloseTo(0, 5);
    });

    it('returns 50% for two equal positions', () => {
      expect(diversificationScore([50, 50])).toBeCloseTo(50, 5);
    });

    it('increases as positions are more evenly spread', () => {
      expect(diversificationScore([50, 50])).toBeLessThan(diversificationScore([25, 25, 25, 25]));
    });
  });

  // ── maxConcentration ───────────────────────────────────────────
  describe('maxConcentration', () => {
    it('returns the largest weight', () => {
      expect(maxConcentration([60, 25, 15])).toBe(60);
    });

    it('returns 0 for an empty array', () => {
      expect(maxConcentration([])).toBe(0);
    });
  });

  // ── winRate ────────────────────────────────────────────────────
  describe('winRate', () => {
    it('returns 100% when all positions are profitable', () => {
      expect(winRate([100, 200, 50])).toBe(100);
    });

    it('returns 0% when all positions are at a loss', () => {
      expect(winRate([-100, -50])).toBe(0);
    });

    it('returns 50% for half winners', () => {
      expect(winRate([100, -50])).toBe(50);
    });

    it('returns 0 for an empty array', () => {
      expect(winRate([])).toBe(0);
    });

    it('does not count break-even (0) as a win', () => {
      expect(winRate([0, 100])).toBe(50);
    });
  });

  // ── portfolioHealthScore ───────────────────────────────────────
  describe('portfolioHealthScore', () => {
    it('returns a high score for a healthy portfolio', () => {
      const score = portfolioHealthScore(80, 80, true);
      expect(score).toBeGreaterThanOrEqual(70);
    });

    it('returns a lower score when portfolio is at a loss', () => {
      const profitable = portfolioHealthScore(80, 80, true);
      const losing     = portfolioHealthScore(80, 80, false);
      expect(losing).toBeLessThan(profitable);
    });

    it('is bounded between 0 and 100', () => {
      const s1 = portfolioHealthScore(0, 0, false);
      const s2 = portfolioHealthScore(100, 100, true);
      expect(s1).toBeGreaterThanOrEqual(0);
      expect(s2).toBeLessThanOrEqual(100);
    });

    it('matches manual weighting calculation', () => {
      // winRate=60, div=70, isProfitable=true → 60*0.4 + 70*0.4 + 100*0.2 = 72
      expect(portfolioHealthScore(60, 70, true)).toBe(72);
    });
  });

  // ── portfolioVolatility ────────────────────────────────────────
  describe('portfolioVolatility', () => {
    it('returns null for fewer than 2 positions', () => {
      expect(portfolioVolatility([{ weight: 100, dailyReturnPercent: 1 }])).toBeNull();
      expect(portfolioVolatility([])).toBeNull();
    });

    it('returns null when total weight is 0', () => {
      expect(portfolioVolatility([
        { weight: 0, dailyReturnPercent: 1 },
        { weight: 0, dailyReturnPercent: 2 },
      ])).toBeNull();
    });

    it('returns 0 when all positions have the same daily return', () => {
      const result = portfolioVolatility([
        { weight: 50, dailyReturnPercent: 2 },
        { weight: 50, dailyReturnPercent: 2 },
      ]);
      expect(result).toBeCloseTo(0, 5);
    });

    it('returns a positive number for mixed returns', () => {
      const result = portfolioVolatility([
        { weight: 50, dailyReturnPercent:  3 },
        { weight: 50, dailyReturnPercent: -1 },
      ]);
      expect(result).toBeGreaterThan(0);
    });

    it('increases with more dispersed returns', () => {
      const low = portfolioVolatility([
        { weight: 50, dailyReturnPercent: 1.1 },
        { weight: 50, dailyReturnPercent: 0.9 },
      ]);
      const high = portfolioVolatility([
        { weight: 50, dailyReturnPercent:  5 },
        { weight: 50, dailyReturnPercent: -5 },
      ]);
      expect(high!).toBeGreaterThan(low!);
    });
  });

  // ── maxDrawdown ────────────────────────────────────────────────
  describe('maxDrawdown', () => {
    it('returns 0 for fewer than 2 values', () => {
      expect(maxDrawdown([100])).toBe(0);
      expect(maxDrawdown([])).toBe(0);
    });

    it('returns 0 for a monotonically increasing series', () => {
      expect(maxDrawdown([100, 110, 120, 130])).toBe(0);
    });

    it('computes 50% drawdown correctly', () => {
      // Peak 200, trough 100 → 50%
      expect(maxDrawdown([100, 200, 100])).toBeCloseTo(50, 5);
    });

    it('finds the worst drawdown across multiple declines', () => {
      // Two drawdowns: 100→80 (20%) and 120→60 (50%) — should return 50
      expect(maxDrawdown([100, 80, 120, 60])).toBeCloseTo(50, 5);
    });

    it('handles a purely declining series', () => {
      expect(maxDrawdown([100, 50])).toBeCloseTo(50, 5);
    });
  });
});
