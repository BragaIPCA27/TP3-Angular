export interface MoverStock {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface MarketMovers {
  gainers: MoverStock[];
  losers: MoverStock[];
}

export interface SectorPerf {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
}

export interface NewsArticle {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: number;
  related: string;
}
