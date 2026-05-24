import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { PortfolioStore } from '../../core/store/portfolio.store';
import { MarketApiService } from '../../core/api/market-api.service';
import { KpiCardComponent, KpiCardData } from './components/kpi-card/kpi-card.component';
import { AllocationDonutComponent } from '../../shared/charts/allocation-donut/allocation-donut.component';
import { RecentTxComponent } from './components/recent-tx/recent-tx.component';
import { WatchlistPanelComponent } from './components/watchlist-panel/watchlist-panel.component';
import { MarketTickerComponent } from './components/market-ticker/market-ticker.component';
import { MarketMoversComponent } from './components/market-movers/market-movers.component';
import { SectorPerfComponent } from './components/sector-perf/sector-perf.component';
import { MarketMovers, SectorPerf } from '../../core/models/market.model';
import { WatchlistItem } from '../../core/models/stock.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    KpiCardComponent, AllocationDonutComponent,
    RecentTxComponent, WatchlistPanelComponent, MarketTickerComponent,
    MarketMoversComponent, SectorPerfComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly destroyRef  = inject(DestroyRef);
  readonly store               = inject(PortfolioStore);
  private readonly marketApi   = inject(MarketApiService);

  readonly movers          = signal<MarketMovers>({ gainers: [], losers: [] });
  readonly sectors         = signal<SectorPerf[]>([]);
  readonly moversLoading   = signal(false);

  readonly tickerItems = computed<WatchlistItem[]>(() => {
    const m   = this.movers();
    const all = [...this.store.watchlistItems(), ...m.gainers, ...m.losers];
    const seen = new Set<string>();
    return all.filter(i => { if (seen.has(i.ticker)) return false; seen.add(i.ticker); return true; });
  });

  readonly kpiCards = computed<KpiCardData[]>(() => {
    const s       = this.store.summary();
    const loading = this.store.loading();
    return [
      { label: 'Valor Total',      value: s.accountValue,    icon: 'bi-safe2-fill',                                                                                           iconBg: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400',                                                                                   loading },
      { label: 'Valor Carteira',   value: s.portfolioValue,  icon: 'bi-bar-chart-fill',                                                                                       iconBg: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',                                                                                 loading },
      { label: 'Resultado Total',  value: s.totalProfitLoss, change: s.totalProfitLossPercent, changeLabel: 'total', icon: s.totalProfitLoss >= 0 ? 'bi-graph-up-arrow'   : 'bi-graph-down-arrow', iconBg: s.totalProfitLoss >= 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400', loading },
      { label: 'P&L Diário',       value: s.dailyPL,         change: s.dailyPLPercent,         changeLabel: 'hoje',  icon: s.dailyPL         >= 0 ? 'bi-lightning-charge-fill' : 'bi-lightning-charge', iconBg: s.dailyPL >= 0         ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400', loading },
      { label: 'Saldo Disponível', value: s.balance,         icon: 'bi-piggy-bank-fill',                                                                                      iconBg: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400',                                                                                       loading },
    ];
  });

  ngOnInit(): void {
    timer(0, 60_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      void this.store.refreshQuotes(true);
    });
    timer(0, 5 * 60_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      void this.loadMarketData();
    });
  }

  private async loadMarketData(): Promise<void> {
    this.moversLoading.set(true);
    try {
      const [moversData, sectorsData] = await Promise.all([
        firstValueFrom(this.marketApi.getMovers()),
        firstValueFrom(this.marketApi.getSectorPerf()),
      ]);
      this.movers.set(moversData);
      this.sectors.set(sectorsData);
    } catch { /* silent */ }
    finally { this.moversLoading.set(false); }
  }
}
