export type SignalType =
  | 'momentum_buy'
  | 'momentum_sell'
  | 'sector_leader'
  | 'sector_laggard'
  | 'relative_strength'
  | 'relative_weakness'
  | 'high_volatility'
  | 'near_high'
  | 'near_low'
  | 'portfolio_winner'
  | 'portfolio_loser'
  | 'watchlist_entry';

export type SignalAction = 'buy' | 'sell' | 'watch' | 'hold';

export interface Signal {
  ticker:      string;
  name:        string;
  sector:      string;
  type:        SignalType;
  action:      SignalAction;
  strength:    1 | 2 | 3 | 4 | 5; // 1=weak, 5=very strong
  title:       string;
  description: string;
  price:       number;
  changePercent: number;
  metrics:     Record<string, number | string>;
}
