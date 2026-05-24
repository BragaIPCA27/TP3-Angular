/**
 * Profit & Loss mathematics — pure functions only.
 * No Angular, no UI, no side effects.
 */

export interface TxRecord {
  type: 'BUY' | 'SELL';
  ticker: string;
  quantity: number;
  price: number;
  timestamp: string;
}

/** Absolute unrealized P&L: market_value - cost_basis */
export function unrealizedPnL(mv: number, invested: number): number {
  return mv - invested;
}

/**
 * Unrealized P&L as a percentage of cost basis.
 * Returns 0 when invested value is 0.
 */
export function unrealizedPnLPercent(mv: number, invested: number): number {
  if (invested === 0) return 0;
  return ((mv - invested) / invested) * 100;
}

/** Absolute daily change for a position: per-share change × quantity */
export function dailyPositionChange(dailyChangePerShare: number, quantity: number): number {
  return dailyChangePerShare * quantity;
}

/**
 * Realized P&L from the full transaction history.
 *
 * Method: weighted average cost (WACC) per ticker.
 * Processes transactions in chronological order.
 * On BUY  → update cost basis using WACC formula.
 * On SELL → realize (sale_price - avg_cost) × qty.
 */
export function realizedPnL(transactions: ReadonlyArray<TxRecord>): number {
  const chronological = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const book: Record<string, { qty: number; avgCost: number }> = {};
  let realized = 0;

  for (const tx of chronological) {
    const t = tx.ticker;
    if (!book[t]) book[t] = { qty: 0, avgCost: 0 };
    const entry = book[t];

    if (tx.type === 'BUY') {
      const newQty = entry.qty + tx.quantity;
      book[t] = {
        qty: newQty,
        avgCost:
          newQty === 0
            ? 0
            : (entry.qty * entry.avgCost + tx.quantity * tx.price) / newQty,
      };
    } else {
      realized += (tx.price - entry.avgCost) * tx.quantity;
      book[t] = { ...entry, qty: Math.max(0, entry.qty - tx.quantity) };
    }
  }

  return realized;
}
