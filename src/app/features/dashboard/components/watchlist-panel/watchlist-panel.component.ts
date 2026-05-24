import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WatchlistItem } from '../../../../core/models/stock.model';
import { CurrencyFmtPipe } from '../../../../shared/pipes/currency-fmt.pipe';
import { ChangeTextPipe, ChangeClassPipe } from '../../../../shared/pipes/change.pipe';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { TickerLogoComponent } from '../../../../shared/components/ticker-logo/ticker-logo.component';

@Component({
  selector: 'app-watchlist-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CurrencyFmtPipe, ChangeTextPipe, ChangeClassPipe, EmptyStateComponent, TickerLogoComponent],
  template: `
    <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card h-full flex flex-col">
      <div class="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-700">
        <div class="flex items-center gap-2">
          <i class="bi bi-star-fill text-amber-400"></i>
          <span class="text-sm font-bold text-slate-700 dark:text-slate-200">Watchlist</span>
        </div>
        <a routerLink="/watchlist" class="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors">
          Gerir <i class="bi bi-arrow-right ms-1"></i>
        </a>
      </div>

      <!-- Add input -->
      <div class="flex gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <input
          class="flex-1 h-8 px-3 rounded-lg bg-slate-100 dark:bg-slate-700 border border-transparent focus:border-brand-500 text-xs font-bold tracking-wider text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none uppercase"
          placeholder="Adicionar ticker…"
          [(ngModel)]="newTicker"
          (keydown.enter)="emitAdd()" />
        <button
          class="w-8 h-8 rounded-lg bg-brand-500 hover:bg-brand-600 flex items-center justify-center text-white transition-colors"
          (click)="emitAdd()">
          <i class="bi bi-plus text-base"></i>
        </button>
      </div>

      <!-- List -->
      <div class="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700">
        @if (items.length) {
          @for (item of items; track item.ticker) {
            <div class="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
              <app-ticker-logo [ticker]="item.ticker" [size]="30" (click)="chartTicker.emit(item.ticker)" class="cursor-pointer"></app-ticker-logo>
              <div class="flex-1 min-w-0 cursor-pointer" (click)="chartTicker.emit(item.ticker)">
                <p class="text-sm font-extrabold tracking-wide text-slate-800 dark:text-slate-100 hover:text-brand-500 transition-colors">{{ item.ticker }}</p>
                @if (item.price > 0) {
                  <p class="text-xs text-slate-400 tabular-nums">{{ item.price | currencyFmt:2 }}</p>
                }
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                @if (item.price > 0) {
                  <span class="text-xs font-bold tabular-nums" [ngClass]="item.changePercent | changeClass">
                    {{ item.changePercent | changeText }}
                  </span>
                }
                <button
                  class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all opacity-0 group-hover:opacity-100"
                  title="Comprar"
                  (click)="buyTicker.emit(item.ticker)">
                  <i class="bi bi-bag-plus text-sm"></i>
                </button>
                <button
                  class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all opacity-0 group-hover:opacity-100"
                  title="Remover"
                  (click)="removeTicker.emit(item.ticker)">
                  <i class="bi bi-x text-base"></i>
                </button>
              </div>
            </div>
          }
        } @else {
          <app-empty-state icon="star" title="Watchlist vazia" subtitle="Adicione tickers para acompanhar."></app-empty-state>
        }
      </div>
    </div>
  `,
})
export class WatchlistPanelComponent {
  @Input({ required: true }) items: WatchlistItem[] = [];
  @Output() addTicker    = new EventEmitter<string>();
  @Output() removeTicker = new EventEmitter<string>();
  @Output() buyTicker    = new EventEmitter<string>();
  @Output() chartTicker  = new EventEmitter<string>();

  newTicker = '';

  emitAdd(): void {
    const t = this.newTicker.trim().toUpperCase();
    if (t) { this.addTicker.emit(t); this.newTicker = ''; }
  }
}
