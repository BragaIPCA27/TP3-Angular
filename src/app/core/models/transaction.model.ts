export type TransactionType = 'BUY' | 'SELL';

export interface Transaction {
  id: string;
  type: TransactionType;
  ticker: string;
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
  balanceAfter: number;
}
