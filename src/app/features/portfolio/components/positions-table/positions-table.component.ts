import { Component, EventEmitter, Input, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioPositionView } from '../../../../core/models/portfolio.model';
import { CurrencyFmtPipe } from '../../../../shared/pipes/currency-fmt.pipe';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { TickerLogoComponent } from '../../../../shared/components/ticker-logo/ticker-logo.component';
import { SortDirection } from '../../../../core/models/stock.model';

type SortField = keyof Pick<PortfolioPositionView, 'ticker' | 'quantity' | 'averagePrice' | 'currentPrice' | 'marketValue' | 'profitLoss' | 'profitLossPercent' | 'dailyChangePercent' | 'weight'>;

@Component({
  selector: 'app-positions-table',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFmtPipe, EmptyStateComponent, TickerLogoComponent],
  templateUrl: './positions-table.component.html',
})
export class PositionsTableComponent {
  @Input({ required: true }) rows: PortfolioPositionView[] = [];
  @Input() loading = false;
  @Output() removeRow    = new EventEmitter<string>();
  @Output() selectTicker = new EventEmitter<string>();
  @Output() openTrade    = new EventEmitter<{ mode: 'buy' | 'sell'; ticker: string }>();

  readonly filter   = signal('');
  readonly sortField = signal<SortField>('marketValue');
  readonly sortDir   = signal<SortDirection>('desc');

  readonly filtered = computed(() => {
    const q = this.filter().toLowerCase();
    let src = q ? this.rows.filter(r => r.ticker.toLowerCase().includes(q) || r.company.toLowerCase().includes(q)) : [...this.rows];
    const f = this.sortField();
    const d = this.sortDir();
    src.sort((a, b) => {
      const av = a[f] as number | string;
      const bv = b[f] as number | string;
      if (typeof av === 'string') return d === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return d === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return src;
  });

  readonly totals = computed(() => ({
    invested: this.rows.reduce((s, r) => s + r.investedValue, 0),
    market:   this.rows.reduce((s, r) => s + r.marketValue,   0),
    pl:       this.rows.reduce((s, r) => s + r.profitLoss,    0),
  }));

  sort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('desc');
    }
  }

  sortIcon(field: SortField): string {
    if (this.sortField() !== field) return 'bi-arrow-down-up text-slate-300';
    return this.sortDir() === 'asc' ? 'bi-sort-up text-brand-500' : 'bi-sort-down text-brand-500';
  }
}
