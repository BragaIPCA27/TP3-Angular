import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { CurrencyFmtPipe } from '../../../../shared/pipes/currency-fmt.pipe';
import { ChangeTextPipe, ChangeBgPipe } from '../../../../shared/pipes/change.pipe';

export interface KpiCardData {
  label: string;
  value: number;
  valueFmt?: 'currency' | 'number';
  change?: number;
  changeLabel?: string;
  icon: string;
  iconBg: string;
  loading?: boolean;
}

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, SkeletonComponent, CurrencyFmtPipe, ChangeTextPipe, ChangeBgPipe],
  template: `
    <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-5 hover:shadow-card-md transition-shadow">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <p class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">{{ data.label }}</p>
          @if (data.loading) {
            <app-skeleton height="1.75rem" width="10rem"></app-skeleton>
          } @else {
            <p class="text-2xl font-extrabold tabular-nums text-slate-800 dark:text-slate-100 leading-none">
              {{ data.valueFmt === 'number' ? data.value : (data.value | currencyFmt:0) }}
            </p>
          }
          @if (data.change !== undefined && !data.loading) {
            <div class="flex items-center gap-1.5 mt-2">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                [ngClass]="data.change | changeBg">
                <i class="bi text-[10px]"
                  [class.bi-arrow-up-short]="data.change > 0"
                  [class.bi-arrow-down-short]="data.change < 0"
                  [class.bi-dash]="data.change === 0">
                </i>
                {{ data.change | changeText }}
              </span>
              @if (data.changeLabel) {
                <span class="text-xs text-slate-400">{{ data.changeLabel }}</span>
              }
            </div>
          }
        </div>
        <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" [ngClass]="data.iconBg">
          <i class="bi text-lg" [class]="data.icon"></i>
        </div>
      </div>
    </div>
  `,
})
export class KpiCardComponent {
  @Input({ required: true }) data!: KpiCardData;
}
