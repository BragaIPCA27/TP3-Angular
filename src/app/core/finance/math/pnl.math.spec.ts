import {
  dailyPositionChange,
  realizedPnL,
  unrealizedPnL,
  unrealizedPnLPercent,
} from './pnl.math';
import type { TxRecord } from './pnl.math';

describe('pnl.math', () => {

  // ── unrealizedPnL ──────────────────────────────────────────────
  describe('unrealizedPnL', () => {
    it('returns positive value when price is above cost', () => {
      expect(unrealizedPnL(1200, 1000)).toBe(200);
    });

    it('returns negative value when price is below cost', () => {
      expect(unrealizedPnL(800, 1000)).toBe(-200);
    });

    it('returns 0 when price equals cost', () => {
      expect(unrealizedPnL(1000, 1000)).toBe(0);
    });

    it('returns 0 for zero invested value', () => {
      expect(unrealizedPnL(0, 0)).toBe(0);
    });
  });

  // ── unrealizedPnLPercent ───────────────────────────────────────
  describe('unrealizedPnLPercent', () => {
    it('computes gain percentage correctly', () => {
      expect(unrealizedPnLPercent(1100, 1000)).toBeCloseTo(10, 5);
    });

    it('computes loss percentage correctly', () => {
      expect(unrealizedPnLPercent(900, 1000)).toBeCloseTo(-10, 5);
    });

    it('returns 0 when invested value is 0', () => {
      expect(unrealizedPnLPercent(500, 0)).toBe(0);
    });

    it('handles 50% gain correctly', () => {
      expect(unrealizedPnLPercent(150, 100)).toBeCloseTo(50, 5);
    });

    it('handles 100% loss correctly', () => {
      expect(unrealizedPnLPercent(0, 100)).toBeCloseTo(-100, 5);
    });
  });

  // ── dailyPositionChange ────────────────────────────────────────
  describe('dailyPositionChange', () => {
    it('scales per-share change by quantity', () => {
      expect(dailyPositionChange(1.5, 10)).toBe(15);
    });

    it('handles negative daily change', () => {
      expect(dailyPositionChange(-2, 5)).toBe(-10);
    });

    it('returns 0 for zero quantity', () => {
      expect(dailyPositionChange(3, 0)).toBe(0);
    });
  });

  // ── realizedPnL ────────────────────────────────────────────────
  describe('realizedPnL', () => {
    it('returns 0 for an empty transaction list', () => {
      expect(realizedPnL([])).toBe(0);
    });

    it('returns 0 with only BUY transactions', () => {
      const txs: TxRecord[] = [
        { type: 'BUY', ticker: 'AAPL', quantity: 10, price: 100, timestamp: '2024-01-01T00:00:00Z' },
      ];
      expect(realizedPnL(txs)).toBe(0);
    });

    it('computes simple profit on a full sell', () => {
      // Buy 10 @ $100, sell 10 @ $120 → profit = $200
      const txs: TxRecord[] = [
        { type: 'BUY',  ticker: 'AAPL', quantity: 10, price: 100, timestamp: '2024-01-01T00:00:00Z' },
        { type: 'SELL', ticker: 'AAPL', quantity: 10, price: 120, timestamp: '2024-06-01T00:00:00Z' },
      ];
      expect(realizedPnL(txs)).toBeCloseTo(200, 5);
    });

    it('computes simple loss on a full sell', () => {
      // Buy 10 @ $100, sell 10 @ $80 → loss = -$200
      const txs: TxRecord[] = [
        { type: 'BUY',  ticker: 'AAPL', quantity: 10, price: 100, timestamp: '2024-01-01T00:00:00Z' },
        { type: 'SELL', ticker: 'AAPL', quantity: 10, price:  80, timestamp: '2024-06-01T00:00:00Z' },
      ];
      expect(realizedPnL(txs)).toBeCloseTo(-200, 5);
    });

    it('uses weighted average cost for two buys before a sell', () => {
      // Buy 10 @ $100, buy 10 @ $120 → avg = $110
      // Sell 10 @ $130 → profit = (130 - 110) × 10 = $200
      const txs: TxRecord[] = [
        { type: 'BUY',  ticker: 'AAPL', quantity: 10, price: 100, timestamp: '2024-01-01T00:00:00Z' },
        { type: 'BUY',  ticker: 'AAPL', quantity: 10, price: 120, timestamp: '2024-03-01T00:00:00Z' },
        { type: 'SELL', ticker: 'AAPL', quantity: 10, price: 130, timestamp: '2024-06-01T00:00:00Z' },
      ];
      expect(realizedPnL(txs)).toBeCloseTo(200, 5);
    });

    it('handles partial sells correctly', () => {
      // Buy 20 @ $100, sell 10 @ $150 → profit = $500
      const txs: TxRecord[] = [
        { type: 'BUY',  ticker: 'AAPL', quantity: 20, price: 100, timestamp: '2024-01-01T00:00:00Z' },
        { type: 'SELL', ticker: 'AAPL', quantity: 10, price: 150, timestamp: '2024-06-01T00:00:00Z' },
      ];
      expect(realizedPnL(txs)).toBeCloseTo(500, 5);
    });

    it('accumulates realized P&L across multiple tickers', () => {
      // AAPL: buy 10 @ $100, sell 10 @ $110 → +$100
      // MSFT: buy 5  @ $200, sell 5  @ $180 → -$100
      // Net → $0
      const txs: TxRecord[] = [
        { type: 'BUY',  ticker: 'AAPL', quantity: 10, price: 100, timestamp: '2024-01-01T00:00:00Z' },
        { type: 'BUY',  ticker: 'MSFT', quantity:  5, price: 200, timestamp: '2024-01-02T00:00:00Z' },
        { type: 'SELL', ticker: 'AAPL', quantity: 10, price: 110, timestamp: '2024-06-01T00:00:00Z' },
        { type: 'SELL', ticker: 'MSFT', quantity:  5, price: 180, timestamp: '2024-06-02T00:00:00Z' },
      ];
      expect(realizedPnL(txs)).toBeCloseTo(0, 5);
    });

    it('processes transactions in chronological order regardless of input order', () => {
      // Input reversed — result must be identical to chronological
      const txs: TxRecord[] = [
        { type: 'SELL', ticker: 'AAPL', quantity: 10, price: 120, timestamp: '2024-06-01T00:00:00Z' },
        { type: 'BUY',  ticker: 'AAPL', quantity: 10, price: 100, timestamp: '2024-01-01T00:00:00Z' },
      ];
      expect(realizedPnL(txs)).toBeCloseTo(200, 5);
    });
  });
});
