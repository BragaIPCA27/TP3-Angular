export type ChartRange = '1D' | '1W' | '1M' | '3M' | '1Y';

export interface StockCandleResponse {
  c: number[]; h: number[]; l: number[]; o: number[];
  s: string;   t: number[]; v: number[];
}

export interface CandlePoint {
  x: number;
  y: [number, number, number, number];
  volume: number;
}

export interface ChartStatistics {
  currentPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  previousClose: number;
  volume: number;
  changePercent: number;
}

export interface ChartSnapshot {
  symbol: string;
  range: ChartRange;
  points: CandlePoint[];
  statistics: ChartStatistics;
}
