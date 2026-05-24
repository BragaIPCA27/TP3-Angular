import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WatchlistItem } from '../../../../core/models/stock.model';
import { CurrencyFmtPipe } from '../../../../shared/pipes/currency-fmt.pipe';
import { ChangeTextPipe, ChangeClassPipe } from '../../../../shared/pipes/change.pipe';

@Component({
  selector: 'app-market-ticker',
  standalone: true,
  imports: [CommonModule, CurrencyFmtPipe, ChangeTextPipe, ChangeClassPipe],
  template: `
    <div class="overflow-hidden h-9 flex items-center bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      @if (items.length) {
        <div class="ticker-track flex items-center whitespace-nowrap gap-0">
          @for (item of twoRepeats; track $index) {
            <div class="inline-flex items-center gap-2 px-4 text-xs">
              <span class="font-extrabold tracking-wider text-slate-700 dark:text-slate-200">{{ item.ticker }}</span>
              <span class="font-semibold tabular-nums text-slate-500 dark:text-slate-400">{{ item.price | currencyFmt:2 }}</span>
              <span class="font-bold tabular-nums" [ngClass]="item.changePercent | changeClass">{{ item.changePercent | changeText }}</span>
            </div>
            <span class="text-slate-300 dark:text-slate-600">|</span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes marquee {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
    .ticker-track {
      animation: marquee 80s linear infinite;
    }
    .ticker-track:hover {
      animation-play-state: paused;
    }
  `],
})
export class MarketTickerComponent {
  @Input({ required: true }) items: WatchlistItem[] = [];

  get twoRepeats(): WatchlistItem[] {
    return [...this.items, ...this.items];
  }
}
