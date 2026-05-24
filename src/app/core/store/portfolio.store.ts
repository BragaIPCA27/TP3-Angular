import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PortfolioPosition, PortfolioPositionView, PortfolioSummary } from '../models/portfolio.model';
import { Transaction } from '../models/transaction.model';
import { Order, OrderSide, OrderType } from '../models/order.model';
import { QuoteData, StockQuoteResponse } from '../models/stock.model';
import { ChartRange } from '../models/chart.model';
import { StockApiService } from '../api/stock-api.service';
import { PortfolioApiService } from '../api/portfolio-api.service';
import { NotificationService } from '../services/notification.service';
import {
  allocationWeight,
  investedValue,
  marketValue,
  weightedAvgCost,
} from '../finance/math';
import {
  unrealizedPnL,
  unrealizedPnLPercent,
  dailyPositionChange,
} from '../finance/math';
import {
  calcSlippage,
  isGapExecution,
  updateTrailingStop,
  effectiveFillPrice,
} from '../finance/math';

const INITIAL_BALANCE = 100_000;

@Injectable({ providedIn: 'root' })
export class PortfolioStore {
  private readonly stockApi = inject(StockApiService);
  private readonly portfolioApi = inject(PortfolioApiService);
  private readonly notifications = inject(NotificationService);

  /* ── Private writable state ── */
  private readonly _balance      = signal(INITIAL_BALANCE);
  private readonly _positions    = signal<PortfolioPosition[]>([]);
  private readonly _transactions = signal<Transaction[]>([]);
  private readonly _watchlist    = signal<string[]>([]);
  private readonly _quotes       = signal<Record<string, QuoteData>>({});
  private readonly _orders       = signal<Order[]>([]);
  private readonly _loading      = signal(false);
  private readonly _synced       = signal(false);

  /* ── Public selectors ── */
  readonly loading  = this._loading.asReadonly();
  readonly synced   = this._synced.asReadonly();
  readonly balance  = this._balance.asReadonly();
  readonly watchlist = this._watchlist.asReadonly();
  readonly quotes   = this._quotes.asReadonly();
  readonly orders   = this._orders.asReadonly();

  readonly pendingOrders = computed(() => this._orders().filter(o => o.status === 'pending'));
  readonly filledOrders  = computed(() => [...this._orders()].filter(o => o.status === 'filled').reverse());

  readonly positionsView = computed<PortfolioPositionView[]>(() => {
    const positions = this._positions();
    const quotes    = this._quotes();

    // Single pass to compute per-position values, then derive total
    const rows = positions.map(p => {
      const ticker  = p.ticker.toUpperCase();
      const q       = quotes[ticker];
      const qty     = Number(p.quantity)     || 0;
      const avg     = Number(p.averagePrice) || 0;
      const cur     = Number(q?.price ?? avg) || 0;
      const inv     = investedValue(qty, avg);
      const mv      = marketValue(qty, cur);
      const pl      = unrealizedPnL(mv, inv);
      const plPct   = unrealizedPnLPercent(mv, inv);
      const dChg    = Number(q?.change ?? 0) || 0;
      const dChgPct = Number(q?.changePercent ?? 0) || 0;
      return { raw: p, ticker, company: p.company || ticker, currentPrice: cur, mv, inv, pl, plPct, dailyChange: dailyPositionChange(dChg, qty), dChgPct };
    });

    const totalMV = rows.reduce((s, r) => s + r.mv, 0);

    return rows.map(r => ({
      ...r.raw,
      ticker:              r.ticker,
      company:             r.company,
      currentPrice:        r.currentPrice,
      marketValue:         r.mv,
      investedValue:       r.inv,
      profitLoss:          r.pl,
      profitLossPercent:   r.plPct,
      dailyChange:         r.dailyChange,
      dailyChangePercent:  r.dChgPct,
      weight:              allocationWeight(r.mv, totalMV),
    }));
  });

  readonly summary = computed<PortfolioSummary>(() => {
    const views = this.positionsView();
    const totalInvested   = views.reduce((s, p) => s + p.investedValue,  0);
    const portfolioValue  = views.reduce((s, p) => s + p.marketValue,    0);
    const dailyPL         = views.reduce((s, p) => s + p.dailyChange,    0);
    const accountValue    = this._balance() + portfolioValue;
    const totalPL         = portfolioValue - totalInvested;
    const totalPLPct      = totalInvested === 0 ? 0 : (totalPL / totalInvested) * 100;
    const dailyPLPct      = totalInvested === 0 ? 0 : (dailyPL / portfolioValue) * 100;
    return { balance: this._balance(), totalInvested, portfolioValue, accountValue, totalProfitLoss: totalPL, totalProfitLossPercent: totalPLPct, dailyPL, dailyPLPercent: dailyPLPct, positionsCount: views.length };
  });

  readonly transactions = computed(() => [...this._transactions()].reverse());

  readonly watchlistItems = computed(() => {
    const q = this._quotes();
    return this._watchlist().map(ticker => ({ ticker, price: q[ticker]?.price ?? 0, change: q[ticker]?.change ?? 0, changePercent: q[ticker]?.changePercent ?? 0 }));
  });

  readonly topGainers = computed(() =>
    [...this.positionsView()].sort((a, b) => b.dailyChangePercent - a.dailyChangePercent).slice(0, 5)
  );

  readonly topLosers = computed(() =>
    [...this.positionsView()].sort((a, b) => a.dailyChangePercent - b.dailyChangePercent).slice(0, 5)
  );

  constructor() {
    void this.syncMongo();
  }

  /* ══════════════════════════════════════
     ACTIONS
  ══════════════════════════════════════ */

  async loadQuotesForTickers(tickers: string[]): Promise<void> {
    if (!tickers.length) return;
    const BATCH = 30;
    for (let i = 0; i < tickers.length; i += BATCH) {
      const batch = tickers.slice(i, i + BATCH);
      try {
        const results = await firstValueFrom(
          forkJoin(batch.map(t => this.stockApi.getQuote(t).pipe(
            catchError(() => of<StockQuoteResponse>({ c: 0, d: 0, dp: 0, h: 0, l: 0, o: 0, pc: 0, t: 0 }))
          )))
        );
        const next = results.reduce<Record<string, QuoteData>>((acc, r, idx) => {
          acc[batch[idx]] = this.stockApi.toQuoteData(r);
          return acc;
        }, {});
        this._quotes.update(q => ({ ...q, ...next }));
      } catch { /* silent */ }
    }
  }

  async refreshQuotes(silent = false): Promise<void> {
    const tickers = [...new Set([
      ...this._positions().map(p => p.ticker),
      ...this._watchlist(),
    ])].filter(Boolean);
    if (!tickers.length) return;

    if (!silent) this._loading.set(true);
    try {
      const results = await firstValueFrom(
        forkJoin(tickers.map(t => this.stockApi.getQuote(t).pipe(
          catchError(() => of<StockQuoteResponse>({ c: 0, d: 0, dp: 0, h: 0, l: 0, o: 0, pc: 0, t: 0 }))
        )))
      );
      const next = results.reduce<Record<string, QuoteData>>((acc, r, i) => {
        acc[tickers[i]] = this.stockApi.toQuoteData(r);
        return acc;
      }, {});
      this._quotes.update(q => ({ ...q, ...next }));
      await this.checkOrders();
      if (!silent) this.notifications.success('Cotações atualizadas', `${tickers.length} ativos sincronizados.`);
      await this.persist();
    } catch {
      if (!silent) this.notifications.error('Erro', 'Não foi possível obter cotações.');
    } finally {
      this._loading.set(false);
    }
  }

  async buyStock(ticker: string, quantity: number): Promise<void> {
    const t = this.norm(ticker);
    if (!t || quantity <= 0) { this.notifications.warning('Dados inválidos', 'Ticker e quantidade obrigatórios.'); return; }
    this._loading.set(true);
    try {
      const quote = await firstValueFrom(this.stockApi.getQuote(t));
      const price = quote.c;
      if (price <= 0) throw new Error('Cotação indisponível.');
      const total = price * quantity;
      if (total > this._balance()) { this.notifications.error('Saldo insuficiente', 'Saldo insuficiente para esta compra.'); return; }

      this._positions.update(ps => {
        const ex = ps.find(p => p.ticker === t);
        if (ex) return ps.map(p => p.ticker !== t ? p : { ...p, quantity: p.quantity + quantity, averagePrice: weightedAvgCost(p.quantity, p.averagePrice, quantity, price) });
        return [...ps, { ticker: t, company: t, quantity, averagePrice: price, acquiredAt: new Date().toISOString() }];
      });
      this._balance.update(b => b - total);
      this.addTx('BUY', t, quantity, price);
      this._quotes.update(q => ({ ...q, [t]: this.stockApi.toQuoteData(quote) }));
      if (!this._watchlist().includes(t)) this._watchlist.update(w => [...w, t]);
      this.notifications.success('Compra executada', `${quantity}× ${t} @ ${this.fmt(price)}`);
      await this.persist();
    } catch (e) { this.notifications.error('Erro na compra', e instanceof Error ? e.message : 'Erro desconhecido.'); }
    finally { this._loading.set(false); }
  }

  async sellStock(ticker: string, quantity: number): Promise<void> {
    const t = this.norm(ticker);
    const pos = this._positions().find(p => p.ticker === t);
    if (!pos) { this.notifications.warning('Posição inexistente', 'Não tem esta ação em carteira.'); return; }
    if (quantity > pos.quantity) { this.notifications.warning('Quantidade insuficiente', `Tem apenas ${pos.quantity} ações.`); return; }
    this._loading.set(true);
    try {
      let price = 0;
      try {
        const quote = await firstValueFrom(this.stockApi.getQuote(t));
        if (quote.c > 0) {
          price = quote.c;
          this._quotes.update(q => ({ ...q, [t]: this.stockApi.toQuoteData(quote) }));
        }
      } catch { /* fall through to cached price */ }

      if (price <= 0) price = this._quotes()[t]?.price ?? 0;
      if (price <= 0) { this.notifications.error('Cotação indisponível', 'Não foi possível obter o preço atual. Tente novamente.'); return; }

      const total  = price * quantity;
      const newQty = pos.quantity - quantity;
      this._positions.update(ps => newQty === 0 ? ps.filter(p => p.ticker !== t) : ps.map(p => p.ticker === t ? { ...p, quantity: newQty } : p));
      this._balance.update(b => b + total);
      this.addTx('SELL', t, quantity, price);
      this.notifications.success('Venda executada', `${quantity}× ${t} @ ${this.fmt(price)}`);
      await this.persist();
    } catch (e) { this.notifications.error('Erro na venda', e instanceof Error ? e.message : 'Erro desconhecido.'); }
    finally { this._loading.set(false); }
  }

  async addPosition(ticker: string, company: string, acquiredAt: string, quantity: number, price: number): Promise<void> {
    const t = this.norm(ticker);
    if (!t || !company.trim() || quantity <= 0 || price <= 0) { this.notifications.warning('Dados inválidos', 'Preencha todos os campos.'); return; }
    this._loading.set(true);
    try {
      this._positions.update(ps => {
        const ex = ps.find(p => p.ticker === t);
        if (ex) return ps.map(p => p.ticker !== t ? p : { ...p, quantity: p.quantity + quantity, averagePrice: weightedAvgCost(p.quantity, p.averagePrice, quantity, price) });
        return [...ps, { ticker: t, company: company.trim(), quantity, averagePrice: price, acquiredAt: acquiredAt || new Date().toISOString() }];
      });
      this.addTx('BUY', t, quantity, price);
      if (!this._watchlist().includes(t)) this._watchlist.update(w => [...w, t]);
      await this.refreshQuotes(true);
      this.notifications.success('Posição adicionada', `${quantity}× ${t}`);
      await this.persist();
    } catch (e) { this.notifications.error('Erro', e instanceof Error ? e.message : 'Erro.'); }
    finally { this._loading.set(false); }
  }

  removePosition(ticker: string): void {
    const t = this.norm(ticker);
    const pos = this._positions().find(p => p.ticker === t);
    if (!pos) return;
    this._positions.update(ps => ps.filter(p => p.ticker !== t));
    this.notifications.success('Removido', `${t} removido da carteira.`);
    void this.persist();
  }

  addToWatchlist(ticker: string): void {
    const t = this.norm(ticker);
    if (!t || this._watchlist().includes(t)) return;
    this._watchlist.update(w => [...w, t]);
    void this.refreshQuotes(true);
    void this.persist();
  }

  bulkAddToWatchlist(tickers: string[]): void {
    const current = this._watchlist();
    const toAdd = tickers.map(t => this.norm(t)).filter(t => t && !current.includes(t));
    if (!toAdd.length) return;
    this._watchlist.update(w => [...w, ...toAdd]);
    void this.refreshQuotes(true);
    void this.persist();
  }

  removeFromWatchlist(ticker: string): void {
    this._watchlist.update(w => w.filter(x => x !== this.norm(ticker)));
    void this.persist();
  }

  resetPortfolio(): void {
    this._balance.set(INITIAL_BALANCE);
    this._positions.set([]);
    this._transactions.set([]);
    this._watchlist.set([]);
    this._quotes.set({});
    this.portfolioApi.reset().subscribe({ error: () => undefined });
    void this.persist();
    this.notifications.info('Carteira reiniciada', `Saldo reposto a ${this.fmt(INITIAL_BALANCE)}.`);
  }

  /* ══════════════════════════════════════
     ORDER ENGINE
  ══════════════════════════════════════ */

  async placeOrder(params: {
    ticker: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    limitPrice?: number;
    stopPrice?: number;
    trailPercent?: number;
  }): Promise<void> {
    const t = this.norm(params.ticker);
    if (!t || params.quantity <= 0) {
      this.notifications.warning('Dados inválidos', 'Ticker e quantidade são obrigatórios.');
      return;
    }
    this._loading.set(true);
    try {
      const quote = await firstValueFrom(this.stockApi.getQuote(t));
      const currentPrice = quote.c;
      if (currentPrice <= 0) throw new Error('Cotação indisponível.');
      this._quotes.update(q => ({ ...q, [t]: this.stockApi.toQuoteData(quote) }));

      if (params.type === 'market') {
        await this.executeMarketOrder(t, params.side, params.quantity, currentPrice);
        return;
      }

      const order: Order = {
        id:            `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ticker:        t,
        side:          params.side,
        type:          params.type,
        quantity:      params.quantity,
        limitPrice:    params.limitPrice,
        stopPrice:     params.stopPrice,
        trailPercent:  params.trailPercent,
        trailHighWatermark: params.type === 'trailing_stop' ? currentPrice : undefined,
        status:        'pending',
        createdAt:     new Date().toISOString(),
        expectedPrice: params.limitPrice ?? params.stopPrice ?? currentPrice,
      };

      this._orders.update(os => [...os, order]);
      if (!this._watchlist().includes(t)) this._watchlist.update(w => [...w, t]);
      this.notifications.success('Ordem colocada', `${order.type.toUpperCase()} ${order.side.toUpperCase()} ${order.quantity}× ${t}`);
      await this.persist();
    } catch (e) {
      this.notifications.error('Erro', e instanceof Error ? e.message : 'Erro desconhecido.');
    } finally {
      this._loading.set(false);
    }
  }

  cancelOrder(orderId: string): void {
    this._orders.update(os => os.map(o => o.id === orderId ? { ...o, status: 'cancelled' as const } : o));
    this.notifications.info('Ordem cancelada', 'A ordem foi cancelada com sucesso.');
    void this.persist();
  }

  /** Called after refreshQuotes — checks pending orders against new prices. */
  async checkOrders(): Promise<void> {
    const pending = this._orders().filter(o => o.status === 'pending');
    if (!pending.length) return;
    const quotes = this._quotes();
    let changed = false;

    for (const order of pending) {
      const q = quotes[order.ticker];
      if (!q) continue;
      const price = q.price;
      const prevClose = price - q.change; // approximate prev close

      // Trailing stop: update watermark first
      if (order.type === 'trailing_stop' && order.trailPercent && order.trailHighWatermark != null) {
        const { newHighWatermark, newStopPrice } = updateTrailingStop({
          currentPrice: price,
          highWatermark: order.trailHighWatermark,
          trailPercent: order.trailPercent,
          side: order.side,
        });
        this._orders.update(os => os.map(o => o.id === order.id
          ? { ...o, trailHighWatermark: newHighWatermark, stopPrice: newStopPrice }
          : o
        ));
        // Check if trailing stop is triggered
        if (order.side === 'sell' && price <= newStopPrice) {
          await this.fillOrder({ ...order, stopPrice: newStopPrice }, price, prevClose);
          changed = true;
        }
        continue;
      }

      const triggered = this.isOrderTriggered(order, price);
      if (triggered) {
        await this.fillOrder(order, price, prevClose);
        changed = true;
      }
    }

    if (changed) await this.persist();
  }

  private isOrderTriggered(order: Order, price: number): boolean {
    switch (order.type) {
      case 'limit':
        return order.side === 'buy'
          ? price <= (order.limitPrice ?? Infinity)
          : price >= (order.limitPrice ?? 0);
      case 'stop':
        return order.side === 'buy'
          ? price >= (order.stopPrice ?? Infinity)
          : price <= (order.stopPrice ?? 0);
      case 'stop_limit':
        return order.side === 'buy'
          ? price >= (order.stopPrice ?? Infinity) && price <= (order.limitPrice ?? Infinity)
          : price <= (order.stopPrice ?? 0) && price >= (order.limitPrice ?? 0);
      case 'take_profit':
        return order.side === 'sell'
          ? price >= (order.limitPrice ?? Infinity)
          : price <= (order.limitPrice ?? 0);
      default:
        return false;
    }
  }

  private async fillOrder(order: Order, currentPrice: number, prevClose: number): Promise<void> {
    const slip = calcSlippage(currentPrice, order.quantity, order.side);
    const gapAmt = currentPrice - prevClose;
    const gapExec = isGapExecution(order.stopPrice ?? order.limitPrice ?? currentPrice, currentPrice, order.side);
    const fillPrice = effectiveFillPrice(
      gapExec ? currentPrice : (order.limitPrice ?? currentPrice),
      0
    );

    const filled: Order = {
      ...order,
      status:        'filled',
      filledAt:      new Date().toISOString(),
      filledPrice:   fillPrice,
      slippage:      slip,
      slippagePct:   (slip / currentPrice) * 100,
      gapExecution:  gapExec,
      gapAmount:     gapExec ? gapAmt : undefined,
    };
    this._orders.update(os => os.map(o => o.id === order.id ? filled : o));

    if (order.side === 'buy') {
      const total = fillPrice * order.quantity;
      if (total > this._balance()) {
        this._orders.update(os => os.map(o => o.id === order.id ? { ...o, status: 'rejected' as const } : o));
        this.notifications.error('Ordem rejeitada', `Saldo insuficiente para ${order.quantity}× ${order.ticker}.`);
        return;
      }
      this._positions.update(ps => {
        const ex = ps.find(p => p.ticker === order.ticker);
        if (ex) return ps.map(p => p.ticker !== order.ticker ? p : {
          ...p, quantity: p.quantity + order.quantity,
          averagePrice: weightedAvgCost(p.quantity, p.averagePrice, order.quantity, fillPrice),
        });
        return [...ps, { ticker: order.ticker, company: order.ticker, quantity: order.quantity, averagePrice: fillPrice, acquiredAt: new Date().toISOString() }];
      });
      this._balance.update(b => b - total);
      this.addTx('BUY', order.ticker, order.quantity, fillPrice);
    } else {
      const pos = this._positions().find(p => p.ticker === order.ticker);
      if (!pos || order.quantity > pos.quantity) {
        this._orders.update(os => os.map(o => o.id === order.id ? { ...o, status: 'rejected' as const } : o));
        this.notifications.error('Ordem rejeitada', `Posição insuficiente para venda de ${order.ticker}.`);
        return;
      }
      const newQty = pos.quantity - order.quantity;
      this._positions.update(ps => newQty === 0
        ? ps.filter(p => p.ticker !== order.ticker)
        : ps.map(p => p.ticker === order.ticker ? { ...p, quantity: newQty } : p)
      );
      this._balance.update(b => b + fillPrice * order.quantity);
      this.addTx('SELL', order.ticker, order.quantity, fillPrice);
    }

    const label = gapExec ? ' (gap execution)' : '';
    this.notifications.success(
      `Ordem executada${label}`,
      `${order.side.toUpperCase()} ${order.quantity}× ${order.ticker} @ ${this.fmt(fillPrice)}`
    );
  }

  private async executeMarketOrder(ticker: string, side: OrderSide, quantity: number, price: number): Promise<void> {
    const slip = calcSlippage(price, quantity, side);
    const fillPrice = effectiveFillPrice(price, slip);

    if (side === 'buy') {
      const total = fillPrice * quantity;
      if (total > this._balance()) {
        this.notifications.error('Saldo insuficiente', 'Saldo insuficiente para esta compra.');
        return;
      }
      this._positions.update(ps => {
        const ex = ps.find(p => p.ticker === ticker);
        if (ex) return ps.map(p => p.ticker !== ticker ? p : {
          ...p, quantity: p.quantity + quantity,
          averagePrice: weightedAvgCost(p.quantity, p.averagePrice, quantity, fillPrice),
        });
        return [...ps, { ticker, company: ticker, quantity, averagePrice: fillPrice, acquiredAt: new Date().toISOString() }];
      });
      this._balance.update(b => b - total);
      this.addTx('BUY', ticker, quantity, fillPrice);
      if (!this._watchlist().includes(ticker)) this._watchlist.update(w => [...w, ticker]);
    } else {
      const pos = this._positions().find(p => p.ticker === ticker);
      if (!pos) { this.notifications.warning('Posição inexistente', 'Não tem esta ação em carteira.'); return; }
      if (quantity > pos.quantity) { this.notifications.warning('Quantidade insuficiente', `Tem apenas ${pos.quantity} ações.`); return; }
      const newQty = pos.quantity - quantity;
      this._positions.update(ps => newQty === 0
        ? ps.filter(p => p.ticker !== ticker)
        : ps.map(p => p.ticker === ticker ? { ...p, quantity: newQty } : p)
      );
      this._balance.update(b => b + fillPrice * quantity);
      this.addTx('SELL', ticker, quantity, fillPrice);
    }
    const slipMsg = slip !== 0 ? ` (slippage: ${this.fmt(Math.abs(slip))})` : '';
    this.notifications.success('Ordem de mercado executada', `${side.toUpperCase()} ${quantity}× ${ticker} @ ${this.fmt(fillPrice)}${slipMsg}`);
    await this.persist();
  }

  /* ── Private helpers ── */
  private addTx(type: 'BUY' | 'SELL', ticker: string, quantity: number, price: number): void {
    this._transactions.update(ts => [...ts, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type, ticker, quantity, price, total: price * quantity,
      timestamp: new Date().toISOString(), balanceAfter: this._balance(),
    }]);
  }

  private norm(t: string): string { return t.trim().toUpperCase(); }
  private fmt(v: number): string { return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'USD' }).format(v); }

  private async syncMongo(): Promise<void> {
    try {
      const s = await firstValueFrom(this.portfolioApi.load());
      this._balance.set(Number(s.balance ?? INITIAL_BALANCE));
      this._positions.set(Array.isArray(s.positions) ? s.positions : []);
      this._transactions.set(Array.isArray(s.transactions) ? s.transactions : []);
      this._watchlist.set(Array.isArray(s.watchlist) ? s.watchlist : []);
      if (Array.isArray(s.orders)) this._orders.set(s.orders);
      this._synced.set(true);
      await this.refreshQuotes(true);
      await this.checkOrders();
    } catch {
      this.notifications.error('Erro de ligação', 'Não foi possível carregar o portfólio. Verifica a ligação ao servidor.');
    }
  }

  reset(): void {
    this._balance.set(INITIAL_BALANCE);
    this._positions.set([]);
    this._transactions.set([]);
    this._watchlist.set([]);
    this._orders.set([]);
    this._quotes.set({});
    this._synced.set(false);
  }

  async reload(): Promise<void> {
    this.reset();
    await this.syncMongo();
  }

  private async persist(): Promise<void> {
    const state = {
      balance: this._balance(),
      positions: this._positions(),
      transactions: this._transactions(),
      watchlist: this._watchlist(),
      orders: this._orders(),
      selectedTicker: null,
      chartRange: '1M' as ChartRange,
    };
    try { await firstValueFrom(this.portfolioApi.save(state)); } catch { /* silent */ }
  }
}
