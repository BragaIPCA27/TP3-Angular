import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PortfolioStore } from '../../core/store/portfolio.store';
import { SignalsService } from '../../core/finance/signals.service';
import { Signal as TradeSignal, SignalAction } from '../../core/models/signal.model';
import { CATALOG, SECTORS, SECTOR_COLORS, StockItem } from '../stocks/constants/stock-catalog.constants';
import { TickerLogoComponent } from '../../shared/components/ticker-logo/ticker-logo.component';

type Tab    = 'screener' | 'insights';
type SortBy = 'ticker' | 'name' | 'price' | 'change' | 'sector';
type SortDir = 'asc' | 'desc';

interface ScreenerRow extends StockItem {
  price:         number;
  change:        number;
  changePercent: number;
  high:          number;
  low:           number;
  open:          number;
  prevClose:     number;
  inWatchlist:   boolean;
  inPortfolio:   boolean;
  hasQuote:      boolean;
}

@Component({
  selector: 'app-screener',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TickerLogoComponent],
  templateUrl: './screener.component.html',
})
export class ScreenerComponent implements OnInit {
  readonly store = inject(PortfolioStore);
  private readonly signalsSvc = inject(SignalsService);

  readonly activeTab = signal<Tab>('screener');

  // Filters — all signals so computed() reacts to changes
  readonly filterSector    = signal('Todos');
  readonly filterMinPrice  = signal(0);
  readonly filterMaxPrice  = signal(0);
  readonly filterMinChange = signal(-100);
  readonly filterMaxChange = signal(100);
  readonly filterWatchlist = signal(false);
  readonly filterPortfolio = signal(false);
  readonly filterHasQuote  = signal(false);
  readonly filterSearch    = signal('');

  // Sort — signals so filteredRows reacts
  readonly sortBy  = signal<SortBy>('change');
  readonly sortDir = signal<SortDir>('desc');

  readonly sectors = SECTORS;
  readonly sectorColors = SECTOR_COLORS;

  ngOnInit(): void {
    void this.store.loadQuotesForTickers(CATALOG.map(s => s.ticker));
  }

  readonly allRows = computed<ScreenerRow[]>(() => {
    const q   = this.store.quotes();
    const wl  = this.store.watchlist();
    const pos = this.store.positionsView();

    return CATALOG.map(item => {
      const quote = q[item.ticker];
      return {
        ...item,
        price:         quote?.price         ?? 0,
        change:        quote?.change        ?? 0,
        changePercent: quote?.changePercent ?? 0,
        high:          quote?.high          ?? 0,
        low:           quote?.low           ?? 0,
        open:          quote?.open          ?? 0,
        prevClose:     quote?.previousClose ?? 0,
        inWatchlist:   wl.includes(item.ticker),
        inPortfolio:   pos.some(p => p.ticker === item.ticker),
        hasQuote:      !!quote && quote.price > 0,
      };
    });
  });

  readonly filteredRows = computed<ScreenerRow[]>(() => {
    const sector    = this.filterSector();
    const minPrice  = this.filterMinPrice();
    const maxPrice  = this.filterMaxPrice();
    const minChange = this.filterMinChange();
    const maxChange = this.filterMaxChange();
    const onlyWL    = this.filterWatchlist();
    const onlyPort  = this.filterPortfolio();
    const hasQuote  = this.filterHasQuote();
    const search    = this.filterSearch().trim().toUpperCase();
    const by        = this.sortBy();
    const dir       = this.sortDir();

    let rows = this.allRows();

    if (sector !== 'Todos')   rows = rows.filter(r => r.sector === sector);
    if (hasQuote)             rows = rows.filter(r => r.hasQuote);
    if (onlyWL)               rows = rows.filter(r => r.inWatchlist);
    if (onlyPort)             rows = rows.filter(r => r.inPortfolio);
    if (minPrice > 0)         rows = rows.filter(r => r.price >= minPrice);
    if (maxPrice > 0)         rows = rows.filter(r => r.price <= maxPrice);
    rows = rows.filter(r => r.changePercent >= minChange && r.changePercent <= maxChange);
    if (search) rows = rows.filter(r => r.ticker.includes(search) || r.name.toUpperCase().includes(search));

    const d = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      switch (by) {
        case 'ticker':  return d * a.ticker.localeCompare(b.ticker);
        case 'name':    return d * a.name.localeCompare(b.name);
        case 'price':   return d * (a.price - b.price);
        case 'change':  return d * (a.changePercent - b.changePercent);
        case 'sector':  return d * a.sector.localeCompare(b.sector);
        default: return 0;
      }
    });
  });

  readonly signals = computed<TradeSignal[]>(() =>
    this.signalsSvc.generate(
      CATALOG,
      this.store.quotes(),
      this.store.watchlist(),
      this.store.positionsView(),
    )
  );

  readonly signalsByAction = computed(() => {
    const all = this.signals();
    return {
      buy:   all.filter(s => s.action === 'buy'),
      sell:  all.filter(s => s.action === 'sell'),
      watch: all.filter(s => s.action === 'watch' || s.action === 'hold'),
    };
  });


  toggleSort(col: SortBy): void {
    if (this.sortBy() === col) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(col);
      this.sortDir.set(col === 'ticker' || col === 'name' ? 'asc' : 'desc');
    }
  }

  addToWatchlist(ticker: string): void    { this.store.addToWatchlist(ticker); }
  removeFromWatchlist(ticker: string): void { this.store.removeFromWatchlist(ticker); }

  signalActionClass(action: SignalAction): string {
    switch (action) {
      case 'buy':   return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'sell':  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'watch': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'hold':  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return '';
    }
  }

  signalActionLabel(action: SignalAction): string {
    const map: Record<SignalAction, string> = { buy: 'Comprar', sell: 'Vender', watch: 'Monitorizar', hold: 'Manter' };
    return map[action];
  }

  signalStrengthDots(): number[] {
    return [1, 2, 3, 4, 5];
  }

  fmtPrice(v: number): string {
    if (!v) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
  }
}
