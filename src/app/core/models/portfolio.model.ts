export interface PortfolioPosition {
  ticker: string;
  company: string;
  quantity: number;
  averagePrice: number;
  acquiredAt: string;
}

export interface PortfolioPositionView extends PortfolioPosition {
  currentPrice: number;
  marketValue: number;
  investedValue: number;
  profitLoss: number;
  profitLossPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  weight: number;
}

export interface PortfolioSummary {
  balance: number;
  totalInvested: number;
  portfolioValue: number;
  accountValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  dailyPL: number;
  dailyPLPercent: number;
  positionsCount: number;
}
