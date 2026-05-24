import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Transaction } from '../../../../core/models/transaction.model';
import { CurrencyFmtPipe } from '../../../../shared/pipes/currency-fmt.pipe';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { TickerLogoComponent } from '../../../../shared/components/ticker-logo/ticker-logo.component';

@Component({
  selector: 'app-recent-tx',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyFmtPipe, EmptyStateComponent, TickerLogoComponent],
  template: `
    <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card h-full">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
        <div class="flex items-center gap-2">
          <i class="bi bi-clock-history text-brand-500"></i>
          <span class="text-sm font-bold text-slate-700 dark:text-slate-200">Transações Recentes</span>
        </div>
        <a routerLink="/transactions" class="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors">
          Ver todas <i class="bi bi-arrow-right ms-1"></i>
        </a>
      </div>

      @if (items.length) {
        <div class="divide-y divide-slate-50 dark:divide-slate-700">
          @for (tx of items; track tx.id) {
            <div class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <app-ticker-logo [ticker]="tx.ticker" [size]="32"></app-ticker-logo>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ tx.ticker }}</span>
                  <span class="text-xs px-1.5 py-0.5 rounded font-bold"
                    [class]="tx.type === 'BUY' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'">
                    {{ tx.type === 'BUY' ? 'COMPRA' : 'VENDA' }}
                  </span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">{{ tx.quantity }}&#215; &#64; {{ tx.price | currencyFmt:2 }}</p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-sm font-bold tabular-nums"
                  [class]="tx.type === 'BUY' ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'">
                  {{ tx.type === 'BUY' ? '-' : '+' }}{{ tx.total | currencyFmt:0 }}
                </p>
                <p class="text-xs text-slate-400 mt-0.5">{{ tx.timestamp | date:'dd/MM HH:mm' }}</p>
              </div>
            </div>
          }
        </div>
      } @else {
        <app-empty-state icon="receipt" title="Sem transações" subtitle="As suas operações aparecerão aqui."></app-empty-state>
      }
    </div>
  `,
})
export class RecentTxComponent {
  @Input({ required: true }) items: Transaction[] = [];
}
