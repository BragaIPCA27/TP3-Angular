/**
 * Trading engine math: slippage, gap detection, position sizing, risk/reward.
 */

/** Simulates market slippage based on order size and price volatility.
 *  Returns slip amount in dollars (positive = worse fill for buyer). */
export function calcSlippage(price: number, quantity: number, side: 'buy' | 'sell'): number {
  // Base rate: 0.05% + 0.001% per share over 100 (liquidity impact)
  const baseRate = 0.0005;
  const impactRate = Math.max(0, quantity - 100) * 0.00001;
  const totalRate = baseRate + impactRate;
  const slip = price * totalRate;
  return side === 'buy' ? slip : -slip;
}

/** Detects a price gap between previous close and current price.
 *  Returns gap amount; positive = gap up, negative = gap down. */
export function detectGap(prevClose: number, currentPrice: number): number {
  if (!prevClose || !currentPrice) return 0;
  return currentPrice - prevClose;
}

/** Determines if a gap should cause a stop order to execute at current price
 *  rather than the stop price (gap execution / stop gap mechanic). */
export function isGapExecution(stopPrice: number, currentPrice: number, side: 'buy' | 'sell'): boolean {
  if (side === 'buy')  return currentPrice > stopPrice;  // gapped above buy-stop
  if (side === 'sell') return currentPrice < stopPrice;  // gapped below sell-stop
  return false;
}

/** Calculates position size based on account risk parameters. */
export function calcPositionSize(params: {
  accountBalance: number;
  riskPercent: number;    // e.g. 1 = 1%
  entryPrice: number;
  stopLossPrice: number;
}): { shares: number; riskAmount: number; positionValue: number } {
  const { accountBalance, riskPercent, entryPrice, stopLossPrice } = params;
  const riskAmount = accountBalance * (riskPercent / 100);
  const riskPerShare = Math.abs(entryPrice - stopLossPrice);
  if (riskPerShare <= 0) return { shares: 0, riskAmount, positionValue: 0 };
  const shares = Math.floor(riskAmount / riskPerShare);
  return { shares, riskAmount, positionValue: shares * entryPrice };
}

/** Risk/reward ratio for a trade setup. */
export function calcRiskReward(entry: number, stop: number, target: number): number {
  const risk   = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  if (risk === 0) return 0;
  return reward / risk;
}

/** Expected value of a trade given win-rate and R/R ratio. */
export function calcExpectedValue(winRate: number, riskReward: number, riskAmount: number): number {
  const winPct  = winRate / 100;
  const losePct = 1 - winPct;
  return (winPct * riskReward * riskAmount) - (losePct * riskAmount);
}

/** Updates trailing stop high watermark and returns new stop price. */
export function updateTrailingStop(params: {
  currentPrice: number;
  highWatermark: number;
  trailPercent: number;
  side: 'buy' | 'sell';
}): { newHighWatermark: number; newStopPrice: number } {
  const { currentPrice, highWatermark, trailPercent, side } = params;
  if (side === 'sell') {
    const newHigh = Math.max(highWatermark, currentPrice);
    const newStop = newHigh * (1 - trailPercent / 100);
    return { newHighWatermark: newHigh, newStopPrice: newStop };
  } else {
    const newLow  = Math.min(highWatermark, currentPrice);
    const newStop = newLow  * (1 + trailPercent / 100);
    return { newHighWatermark: newLow, newStopPrice: newStop };
  }
}

/** Calculates the effective fill price after slippage. */
export function effectiveFillPrice(price: number, slippage: number): number {
  return price + slippage;
}

/** Maximum shares buyable given balance and price. */
export function maxSharesAffordable(balance: number, price: number): number {
  if (price <= 0) return 0;
  return Math.floor(balance / price);
}
