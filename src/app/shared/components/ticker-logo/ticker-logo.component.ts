import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ticker-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overflow-hidden border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 flex items-center justify-center flex-shrink-0"
      [ngClass]="rounded"
      [style.width.px]="size"
      [style.height.px]="size">
      @if (!failed) {
        <img
          [src]="'https://financialmodelingprep.com/image-stock/' + ticker + '.png'"
          (error)="failed = true"
          class="w-full h-full object-contain p-px"
          [alt]="ticker">
      } @else {
        <span class="font-black text-slate-600 dark:text-slate-300 leading-none select-none"
          [style.font-size.px]="size * 0.4">
          {{ ticker.slice(0, 1) }}
        </span>
      }
    </div>
  `,
})
export class TickerLogoComponent implements OnChanges {
  @Input({ required: true }) ticker = '';
  @Input() size = 32;
  @Input() rounded = 'rounded-lg';

  failed = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ticker']) this.failed = false;
  }
}
