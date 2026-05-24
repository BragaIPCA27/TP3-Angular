import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PortfolioStore } from '../../core/store/portfolio.store';
import { MarketApiService } from '../../core/api/market-api.service';
import { PerfChartComponent } from '../../shared/charts/perf-chart/perf-chart.component';
import { TradeModalComponent, TradeMode, TradePayload } from '../../shared/components/trade-modal/trade-modal.component';
import { ChartRange } from '../../core/models/chart.model';
import { NewsArticle } from '../../core/models/market.model';
import { CurrencyFmtPipe } from '../../shared/pipes/currency-fmt.pipe';
import { TickerLogoComponent } from '../../shared/components/ticker-logo/ticker-logo.component';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFmtPipe, PerfChartComponent, TradeModalComponent, TickerLogoComponent],
  templateUrl: './watchlist.component.html',
})
export class WatchlistComponent {
  readonly store       = inject(PortfolioStore);
  private readonly marketApi = inject(MarketApiService);

  readonly selectedTicker = signal('');
  readonly chartRange     = signal<ChartRange>('1M');
  readonly newTicker      = signal('');
  readonly showTrade      = signal(false);
  readonly tradeMode      = signal<TradeMode>('buy');
  readonly tradeTicker    = signal('');

  readonly news        = signal<NewsArticle[]>([]);
  readonly newsLoading = signal(false);

  readonly holdsSelected = computed(() =>
    this.store.positionsView().some(p => p.ticker === this.selectedTicker())
  );

  readonly ranges: ChartRange[] = ['1D', '1W', '1M', '1Y'];

  constructor() {
    effect(() => {
      const ticker = this.selectedTicker();
      if (ticker) void this.loadNews(ticker);
      else this.news.set([]);
    });
  }

  addTicker(): void {
    const t = this.newTicker().trim().toUpperCase();
    if (!t) return;
    this.store.addToWatchlist(t);
    this.newTicker.set('');
    if (!this.selectedTicker()) this.selectedTicker.set(t);
  }

  select(ticker: string): void {
    this.selectedTicker.set(ticker);
  }

  openTrade(mode: TradeMode, ticker: string): void {
    this.tradeMode.set(mode);
    this.tradeTicker.set(ticker);
    this.showTrade.set(true);
  }

  async onConfirmTrade(p: TradePayload): Promise<void> {
    if (p.mode === 'buy') await this.store.buyStock(p.ticker, p.quantity);
    else                  await this.store.sellStock(p.ticker, p.quantity);
    this.showTrade.set(false);
  }

  timeAgo(timestamp: number): string {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 3600)  return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }

  private async loadNews(ticker: string): Promise<void> {
    this.newsLoading.set(true);
    this.news.set([]);
    try {
      const articles = await firstValueFrom(this.marketApi.getNews(ticker));
      this.news.set(Array.isArray(articles) ? articles : []);
    } catch { this.news.set([]); }
    finally { this.newsLoading.set(false); }
  }
}
