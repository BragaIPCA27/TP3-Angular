import { Injectable } from '@angular/core';
import { Signal as TradeSignal, SignalType, SignalAction } from '../models/signal.model';
import { QuoteData } from '../models/stock.model';
import { StockItem } from '../../features/stocks/constants/stock-catalog.constants';
import { PortfolioPositionView } from '../models/portfolio.model';

interface StockContext {
  item:    StockItem;
  quote:   QuoteData;
  inWatchlist:  boolean;
  inPortfolio:  boolean;
  position?: PortfolioPositionView;
}

@Injectable({ providedIn: 'root' })
export class SignalsService {

  generate(
    catalog:    StockItem[],
    quotes:     Record<string, QuoteData>,
    watchlist:  string[],
    positions:  PortfolioPositionView[],
  ): TradeSignal[] {
    // Build context list — only stocks with real quotes
    const ctx: StockContext[] = catalog
      .map(item => ({
        item,
        quote:       quotes[item.ticker],
        inWatchlist: watchlist.includes(item.ticker),
        inPortfolio: positions.some(p => p.ticker === item.ticker),
        position:    positions.find(p => p.ticker === item.ticker),
      }))
      .filter(c => c.quote && c.quote.price > 0);

    // Sector averages
    const sectorAvg = this.calcSectorAvg(ctx);

    const signals: TradeSignal[] = [];

    for (const c of ctx) {
      const chg  = c.quote.changePercent;
      const sAvg = sectorAvg[c.item.sector] ?? 0;
      const intraRange = c.quote.price > 0
        ? ((c.quote.high - c.quote.low) / c.quote.price) * 100
        : 0;
      const fromHigh = c.quote.high > 0
        ? ((c.quote.price - c.quote.high) / c.quote.high) * 100
        : 0;
      const fromLow = c.quote.low > 0
        ? ((c.quote.price - c.quote.low) / c.quote.low) * 100
        : 0;

      // 1 — Strong momentum buy
      if (chg >= 4) {
        const str: 1|2|3|4|5 = chg >= 8 ? 5 : chg >= 6 ? 4 : 3;
        signals.push(this.make(c, 'momentum_buy', 'buy', str,
          `Alta de +${chg.toFixed(1)}% hoje`,
          `Forte pressão compradora. Se o volume confirmar, pode ser oportunidade de entrada na tendência.`,
          { change: chg, sectorAvg: sAvg }
        ));
      }

      // 2 — Strong momentum sell
      if (chg <= -4) {
        const str: 1|2|3|4|5 = chg <= -8 ? 5 : chg <= -6 ? 4 : 3;
        signals.push(this.make(c, 'momentum_sell', 'sell', str,
          `Queda de ${chg.toFixed(1)}% hoje`,
          `Pressão vendedora significativa. Avalie o stop loss e considere reduzir a posição.`,
          { change: chg, sectorAvg: sAvg }
        ));
      }

      // 3 — Relative strength vs sector
      if (chg > sAvg + 2 && chg > 1) {
        const spread = chg - sAvg;
        const str: 1|2|3|4|5 = spread >= 5 ? 4 : 3;
        signals.push(this.make(c, 'relative_strength', 'buy', str,
          `${spread.toFixed(1)}pp acima do setor ${c.item.sector}`,
          `Está a superar os pares do setor. Ação com força relativa — favorável para novas entradas.`,
          { change: chg, sectorAvg: sAvg, spread }
        ));
      }

      // 4 — Relative weakness vs sector
      if (chg < sAvg - 2 && chg < -1) {
        const spread = sAvg - chg;
        const str: 1|2|3|4|5 = spread >= 5 ? 4 : 3;
        signals.push(this.make(c, 'relative_weakness', 'watch', str,
          `${spread.toFixed(1)}pp abaixo do setor ${c.item.sector}`,
          `Underperform em relação aos pares. Monitorize — pode ser fraqueza pontual ou sinal de distribuição.`,
          { change: chg, sectorAvg: sAvg, spread }
        ));
      }

      // 5 — High intraday volatility
      if (intraRange >= 3 && c.quote.price > 0) {
        const str: 1|2|3|4|5 = intraRange >= 6 ? 5 : intraRange >= 4.5 ? 4 : 3;
        signals.push(this.make(c, 'high_volatility', 'watch', str,
          `Amplitude intraday de ${intraRange.toFixed(1)}%`,
          `Variação entre ${this.fmt(c.quote.low)} e ${this.fmt(c.quote.high)} hoje. Alta volatilidade — ajuste o tamanho da posição.`,
          { high: c.quote.high, low: c.quote.low, range: intraRange }
        ));
      }

      // 6 — Near daily high
      if (fromHigh >= -0.5 && c.quote.price > 0) {
        const str: 1|2|3|4|5 = fromHigh >= -0.1 ? 5 : 4;
        signals.push(this.make(c, 'near_high', 'watch', str,
          `A ${Math.abs(fromHigh).toFixed(2)}% da máxima diária`,
          `Preço em ${this.fmt(c.quote.price)}, máxima em ${this.fmt(c.quote.high)}. Resistência próxima — cuidado com compras no topo.`,
          { price: c.quote.price, high: c.quote.high, distPct: fromHigh }
        ));
      }

      // 7 — Near daily low (potential bounce)
      if (fromLow <= 0.5 && fromLow >= 0 && c.quote.price > 0) {
        const str: 1|2|3|4|5 = fromLow <= 0.1 ? 5 : 4;
        signals.push(this.make(c, 'near_low', 'buy', str,
          `Junto à mínima diária (${this.fmt(c.quote.low)})`,
          `Preço próximo do suporte intraday. Possível zona de bounce — útil para ordens limite ou stop.`,
          { price: c.quote.price, low: c.quote.low, distPct: fromLow }
        ));
      }

      // 8 — Portfolio winner (take profit candidate)
      if (c.inPortfolio && c.position) {
        const plPct = c.position.profitLossPercent;
        if (plPct >= 20) {
          const str: 1|2|3|4|5 = plPct >= 50 ? 5 : plPct >= 35 ? 4 : 3;
          signals.push(this.make(c, 'portfolio_winner', 'sell', str,
            `Posição em lucro de +${plPct.toFixed(1)}%`,
            `Ganho de ${this.fmt(Math.abs(c.position.profitLoss))}. Considere parcial ou trailing stop para proteger o lucro.`,
            { plPct, plAbs: c.position.profitLoss }
          ));
        }
      }

      // 9 — Portfolio loser (stop check)
      if (c.inPortfolio && c.position) {
        const plPct = c.position.profitLossPercent;
        if (plPct <= -10) {
          const str: 1|2|3|4|5 = plPct <= -25 ? 5 : plPct <= -18 ? 4 : 3;
          signals.push(this.make(c, 'portfolio_loser', 'sell', str,
            `Posição em perda de ${plPct.toFixed(1)}%`,
            `Perda de ${this.fmt(Math.abs(c.position.profitLoss))}. Reveja o stop loss ou a tese de investimento.`,
            { plPct, plAbs: c.position.profitLoss }
          ));
        }
      }

      // 10 — Watchlist entry signal (not in portfolio, positive momentum)
      if (c.inWatchlist && !c.inPortfolio && chg >= 2) {
        const str: 1|2|3|4|5 = chg >= 4 ? 4 : 3;
        signals.push(this.make(c, 'watchlist_entry', 'buy', str,
          `Na watchlist e a subir +${chg.toFixed(1)}%`,
          `Tem este ativo monitorizado e está em alta hoje. Pode ser o momento de avaliar uma entrada.`,
          { change: chg }
        ));
      }
    }

    // Sector leaders / laggards
    const bySector = this.groupBySector(ctx);
    for (const [sector, stocks] of Object.entries(bySector)) {
      if (stocks.length < 3) continue;
      const sorted = [...stocks].sort((a, b) => b.quote.changePercent - a.quote.changePercent);

      const leader = sorted[0];
      if (leader.quote.changePercent > 1) {
        signals.push(this.make(leader, 'sector_leader', 'buy', 4,
          `Líder em ${sector} hoje (+${leader.quote.changePercent.toFixed(1)}%)`,
          `Melhor desempenho do setor. Pode indicar rotação para ${sector} ou notícia positiva específica.`,
          { rank: 1, sectorSize: stocks.length }
        ));
      }

      const laggard = sorted[sorted.length - 1];
      if (laggard.quote.changePercent < -1) {
        signals.push(this.make(laggard, 'sector_laggard', 'watch', 3,
          `Pior do setor ${sector} (${laggard.quote.changePercent.toFixed(1)}%)`,
          `Underperform no setor hoje. Monitorize para confirmar se é fraqueza temporária ou tendência.`,
          { rank: stocks.length, sectorSize: stocks.length }
        ));
      }
    }

    // Deduplicate (keep highest strength per ticker+type combo)
    return this.dedup(signals)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 50);
  }

  private make(
    c: StockContext,
    type: SignalType,
    action: SignalAction,
    strength: 1 | 2 | 3 | 4 | 5,
    title: string,
    description: string,
    metrics: Record<string, number | string>,
  ): TradeSignal {
    return {
      ticker:        c.item.ticker,
      name:          c.item.name,
      sector:        c.item.sector,
      type, action, strength, title, description,
      price:         c.quote.price,
      changePercent: c.quote.changePercent,
      metrics,
    };
  }

  private calcSectorAvg(ctx: StockContext[]): Record<string, number> {
    const sums: Record<string, { sum: number; count: number }> = {};
    for (const c of ctx) {
      const s = c.item.sector;
      if (!sums[s]) sums[s] = { sum: 0, count: 0 };
      sums[s].sum   += c.quote.changePercent;
      sums[s].count += 1;
    }
    const result: Record<string, number> = {};
    for (const [s, { sum, count }] of Object.entries(sums)) {
      result[s] = count ? sum / count : 0;
    }
    return result;
  }

  private groupBySector(ctx: StockContext[]): Record<string, StockContext[]> {
    const g: Record<string, StockContext[]> = {};
    for (const c of ctx) {
      if (!g[c.item.sector]) g[c.item.sector] = [];
      g[c.item.sector].push(c);
    }
    return g;
  }

  private dedup(signals: TradeSignal[]): TradeSignal[] {
    const seen = new Map<string, TradeSignal>();
    for (const s of signals) {
      const key = `${s.ticker}:${s.type}`;
      const existing = seen.get(key);
      if (!existing || s.strength > existing.strength) seen.set(key, s);
    }
    return Array.from(seen.values());
  }

  private fmt(v: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
  }
}
