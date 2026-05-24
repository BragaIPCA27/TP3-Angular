export type OrderType   = 'market' | 'limit' | 'stop' | 'stop_limit' | 'take_profit' | 'trailing_stop';
export type OrderSide   = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';

export interface Order {
  id:            string;
  ticker:        string;
  side:          OrderSide;
  type:          OrderType;
  quantity:      number;
  limitPrice?:   number;
  stopPrice?:    number;
  trailPercent?: number;
  trailHighWatermark?: number; // tracks highest price for trailing stop
  status:        OrderStatus;
  createdAt:     string;
  filledAt?:     string;
  filledPrice?:  number;
  expectedPrice: number;
  slippage?:     number;
  slippagePct?:  number;
  gapExecution?: boolean;
  gapAmount?:    number;
  notes?:        string;
}
