import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioStore } from '../../core/store/portfolio.store';
import { Transaction } from '../../core/models/transaction.model';
import { CurrencyFmtPipe } from '../../shared/pipes/currency-fmt.pipe';
import { TickerLogoComponent } from '../../shared/components/ticker-logo/ticker-logo.component';

export type FilterType = 'ALL' | 'BUY' | 'SELL';

interface FilterOption { value: FilterType; label: string; }

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFmtPipe, TickerLogoComponent],
  templateUrl: './transactions.component.html',
})
export class TransactionsComponent {
  readonly store = inject(PortfolioStore);

  readonly filterOptions: FilterOption[] = [
    { value: 'ALL',  label: 'Todas' },
    { value: 'BUY',  label: 'Compras' },
    { value: 'SELL', label: 'Vendas' },
  ];

  readonly filter   = signal<FilterType>('ALL');
  readonly search   = signal('');
  readonly sortDesc = signal(true);

  readonly filtered = computed<Transaction[]>(() => {
    const f = this.filter();
    const q = this.search().toLowerCase();
    let items = this.store.transactions();
    if (f !== 'ALL') items = items.filter(t => t.type === f);
    if (q)           items = items.filter(t => t.ticker.toLowerCase().includes(q));
    return this.sortDesc() ? items : [...items].reverse();
  });

  readonly stats = computed(() => {
    const all = this.store.transactions();
    const buys  = all.filter(t => t.type === 'BUY');
    const sells = all.filter(t => t.type === 'SELL');
    return {
      total:     all.length,
      buys:      buys.length,
      sells:     sells.length,
      totalBuy:  buys.reduce((s, t) => s + t.total, 0),
      totalSell: sells.reduce((s, t) => s + t.total, 0),
    };
  });

  toggleSort(): void { this.sortDesc.set(!this.sortDesc()); }
}
