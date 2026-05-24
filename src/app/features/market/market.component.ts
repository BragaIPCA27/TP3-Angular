import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { MarketApiService } from '../../core/api/market-api.service';
import { PortfolioStore } from '../../core/store/portfolio.store';
import { MarketMovers, SectorPerf } from '../../core/models/market.model';
import { TickerLogoComponent } from '../../shared/components/ticker-logo/ticker-logo.component';

/* Full pool of tickers that rotate through the index strip (5 visible at a time) */
const INDEX_TICKERS = [
  'SPY', 'QQQ', 'DIA', 'IWM', 'AAPL',
  'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META',
  'TSLA', 'JPM', 'XOM', 'GS', 'NFLX',
];

/* Maps SPDR ETF ticker → catalog sector name in stocks page */
const SECTOR_ETF_TO_CATALOG: Record<string, string> = {
  'XLK':  'Tecnologia',
  'XLV':  'Saúde',
  'XLF':  'Finanças',
  'XLE':  'Energia',
  'XLI':  'Industrial',
  'XLY':  'Consumo',
  'XLP':  'Consumo',
  'XLC':  'Telecom',
  'XLU':  'Utilidades',
  'XLRE': 'Imobiliário',
};

@Component({
  selector: 'app-market',
  standalone: true,
  imports: [CommonModule, TickerLogoComponent],
  templateUrl: './market.component.html',
})
export class MarketComponent implements OnInit {
  private readonly marketApi  = inject(MarketApiService);
  private readonly router     = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly store              = inject(PortfolioStore);

  readonly movers       = signal<MarketMovers>({ gainers: [], losers: [] });
  readonly sectors      = signal<SectorPerf[]>([]);
  readonly loading      = signal(true);
  readonly activeMovTab = signal<'gainers' | 'losers'>('gainers');
  readonly rotateOffset = signal(0);

  readonly indexQuotes = computed(() => {
    const q      = this.store.quotes();
    const offset = this.rotateOffset();
    const window = INDEX_TICKERS.slice(offset, offset + 5);
    return window.map(t => ({
      ticker: t,
      price:         q[t]?.price         ?? 0,
      change:        q[t]?.change        ?? 0,
      changePercent: q[t]?.changePercent ?? 0,
    }));
  });

  readonly sectorsSorted = computed(() =>
    [...this.sectors()].sort((a, b) => b.changePercent - a.changePercent)
  );

  readonly maxAbsSector = computed(() =>
    Math.max(1, ...this.sectors().map(s => Math.abs(s.changePercent)))
  );

  ngOnInit(): void {
    /* Load market data immediately then every 5 min */
    timer(0, 5 * 60_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      void this.loadMarketData();
    });
    /* Rotate index strip every 4 s */
    timer(4_000, 4_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.rotateOffset.update(o => (o + 5) % INDEX_TICKERS.length);
    });
    /* Ensure all tickers are in store quotes — single bulk call to avoid rate limits */
    this.store.bulkAddToWatchlist(INDEX_TICKERS);
  }

  goToStock(ticker: string): void {
    void this.router.navigate(['/stocks'], { queryParams: { ticker } });
  }

  goToSector(sector: { ticker: string }): void {
    const catalogSector = SECTOR_ETF_TO_CATALOG[sector.ticker];
    if (catalogSector) {
      void this.router.navigate(['/stocks'], { queryParams: { sector: catalogSector } });
    } else {
      this.goToStock(sector.ticker);
    }
  }

  barWidth(pct: number): number {
    return Math.round((Math.abs(pct) / this.maxAbsSector()) * 100);
  }

  private async loadMarketData(): Promise<void> {
    this.loading.set(true);
    try {
      const [m, s] = await Promise.all([
        firstValueFrom(this.marketApi.getMovers()),
        firstValueFrom(this.marketApi.getSectorPerf()),
      ]);
      this.movers.set(m);
      this.sectors.set(s);
    } catch { /* silent */ }
    finally { this.loading.set(false); }
  }
}
