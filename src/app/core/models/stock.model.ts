export interface StockQuoteResponse {
  c: number;   // current price
  d: number;   // change
  dp: number;  // change percent
  h: number;   // high
  l: number;   // low
  o: number;   // open
  pc: number;  // prev close
  t: number;   // timestamp
}

export interface QuoteData {
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  updatedAt: string;
}

export interface WatchlistItem {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
}

export type SortDirection = 'asc' | 'desc';
