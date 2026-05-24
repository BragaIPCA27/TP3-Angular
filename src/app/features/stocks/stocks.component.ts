import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PortfolioStore } from '../../core/store/portfolio.store';
import { PerfChartComponent } from '../../shared/charts/perf-chart/perf-chart.component';
import { TradeModalComponent, TradeMode, TradePayload } from '../../shared/components/trade-modal/trade-modal.component';
import { ChartRange } from '../../core/models/chart.model';
import { StockItem, CATALOG, SECTOR_COLORS, SECTORS } from './constants/stock-catalog.constants';

@Component({
  selector: 'app-stocks',
  standalone: true,
  imports: [CommonModule, FormsModule, PerfChartComponent, TradeModalComponent],
  templateUrl: './stocks.component.html',
})
export class StocksComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(PortfolioStore);

  readonly selectedTicker = signal('SPY');
  readonly chartRange     = signal<ChartRange>('1M');
  readonly searchInput    = signal('');
  readonly selectedSector = signal('Todos');
  readonly showTrade      = signal(false);
  readonly tradeMode      = signal<TradeMode>('buy');

  readonly sectors = SECTORS;

  readonly filteredStocks = computed(() => {
    const q      = this.searchInput().trim().toUpperCase();
    const sector = this.selectedSector();
    return CATALOG.filter(s =>
      (sector === 'Todos' || s.sector === sector) &&
      (!q || s.ticker.includes(q) || s.name.toUpperCase().includes(q))
    );
  });

  readonly heldTickers = computed(() =>
    new Set(this.store.positionsView().map(p => p.ticker))
  );

  readonly holdsSelected = computed(() =>
    this.heldTickers().has(this.selectedTicker())
  );

  readonly selectedItem = computed(() =>
    CATALOG.find(s => s.ticker === this.selectedTicker()) ?? { ticker: this.selectedTicker(), name: this.selectedTicker(), sector: '' }
  );

  readonly failedLogos = signal(new Set<string>());

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => {
      if (p['sector'] && SECTORS.includes(p['sector'])) {
        this.selectedSector.set(p['sector']);
      }
      if (p['ticker']) this.selectTicker(p['ticker'].toUpperCase());
    });
  }

  logoUrl(ticker: string): string {
    return `https://financialmodelingprep.com/image-stock/${ticker}.png`;
  }

  onLogoError(ticker: string): void {
    this.failedLogos.update(s => new Set([...s, ticker]));
  }

  selectTicker(ticker: string): void {
    const t = ticker.trim().toUpperCase();
    if (t) this.selectedTicker.set(t);
  }

  search(): void {
    const q = this.searchInput().trim().toUpperCase();
    if (!q) return;
    const match = CATALOG.find(s => s.ticker === q);
    this.selectTicker(match ? match.ticker : q);
  }

  sectorClass(sector: string): string {
    return SECTOR_COLORS[sector] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  }

  openTrade(mode: TradeMode): void {
    this.tradeMode.set(mode);
    this.showTrade.set(true);
  }

  async onConfirmTrade(p: TradePayload): Promise<void> {
    if (p.mode === 'buy') await this.store.buyStock(p.ticker, p.quantity);
    else                  await this.store.sellStock(p.ticker, p.quantity);
    this.showTrade.set(false);
  }

  inWatchlist(ticker: string): boolean {
    return this.store.watchlist().includes(ticker);
  }

  toggleWatchlist(ticker: string): void {
    if (this.inWatchlist(ticker)) this.store.removeFromWatchlist(ticker);
    else this.store.addToWatchlist(ticker);
  }

}
