import {
  allocationWeight,
  investedValue,
  marketValue,
  totalMarketValue,
  weightedAvgCost,
} from './portfolio.math';

describe('portfolio.math', () => {

  // ── marketValue ────────────────────────────────────────────────
  describe('marketValue', () => {
    it('multiplies quantity by price', () => {
      expect(marketValue(10, 150)).toBe(1500);
    });

    it('returns 0 for zero quantity', () => {
      expect(marketValue(0, 150)).toBe(0);
    });

    it('returns 0 for zero price', () => {
      expect(marketValue(10, 0)).toBe(0);
    });

    it('handles fractional shares', () => {
      expect(marketValue(0.5, 200)).toBe(100);
    });
  });

  // ── investedValue ──────────────────────────────────────────────
  describe('investedValue', () => {
    it('multiplies quantity by average cost', () => {
      expect(investedValue(10, 100)).toBe(1000);
    });

    it('returns 0 for zero quantity', () => {
      expect(investedValue(0, 100)).toBe(0);
    });
  });

  // ── weightedAvgCost ────────────────────────────────────────────
  describe('weightedAvgCost', () => {
    it('returns add price when existing qty is 0 (first buy)', () => {
      expect(weightedAvgCost(0, 0, 10, 100)).toBe(100);
    });

    it('computes weighted average when adding to existing position', () => {
      // 10 shares @ $100 avg, buy 10 more @ $120 → avg = $110
      expect(weightedAvgCost(10, 100, 10, 120)).toBe(110);
    });

    it('handles unequal lot sizes', () => {
      // 5 shares @ $200, buy 15 @ $100 → (5×200 + 15×100) / 20 = 2500/20 = 125
      expect(weightedAvgCost(5, 200, 15, 100)).toBe(125);
    });

    it('returns 0 when both quantities are 0', () => {
      expect(weightedAvgCost(0, 0, 0, 100)).toBe(0);
    });

    it('existing-only: adding 0 shares keeps the same average', () => {
      expect(weightedAvgCost(10, 50, 0, 0)).toBe(50);
    });
  });

  // ── allocationWeight ───────────────────────────────────────────
  describe('allocationWeight', () => {
    it('computes the percentage of total portfolio', () => {
      expect(allocationWeight(500, 1000)).toBe(50);
    });

    it('returns 0 when total market value is 0', () => {
      expect(allocationWeight(500, 0)).toBe(0);
    });

    it('returns 100 when the position IS the portfolio', () => {
      expect(allocationWeight(1000, 1000)).toBe(100);
    });

    it('handles small fractions', () => {
      expect(allocationWeight(1, 1000)).toBeCloseTo(0.1, 5);
    });
  });

  // ── totalMarketValue ───────────────────────────────────────────
  describe('totalMarketValue', () => {
    it('sums all market values', () => {
      expect(totalMarketValue([500, 300, 200])).toBe(1000);
    });

    it('returns 0 for an empty array', () => {
      expect(totalMarketValue([])).toBe(0);
    });

    it('handles a single position', () => {
      expect(totalMarketValue([750])).toBe(750);
    });
  });
});
