import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DsBadgeComponent } from '../ds-badge/ds-badge.component';

export interface StatCardData {
  label:       string;
  value:       string;
  subtext?:    string;
  change?:     number;
  changeVariant?: 'percent' | 'amount';
  tone?:       'default' | 'positive' | 'negative' | 'warning' | 'brand';
  /** Show a horizontal progress bar (0-100) */
  progress?:   number;
  progressTone?: 'brand' | 'positive' | 'negative' | 'warning';
}

@Component({
  selector: 'ds-stat-card',
  standalone: true,
  imports: [CommonModule, DsBadgeComponent],
  template: `
    <div class="ds-card-flat px-4 py-3 flex flex-col gap-1">

      <p class="ds-label">{{ data.label }}</p>

      <p class="text-xl font-extrabold tabular-nums" [class]="valueClass">
        {{ data.value }}
      </p>

      @if (data.subtext) {
        <p class="ds-subtext">{{ data.subtext }}</p>
      }

      @if (data.change !== undefined) {
        <ds-badge [value]="data.change" [variant]="data.changeVariant ?? 'percent'"></ds-badge>
      }

      @if (data.progress !== undefined) {
        <div class="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mt-0.5">
          <div class="h-full rounded-full transition-all" [class]="progressBarClass" [style.width.%]="data.progress"></div>
        </div>
      }
    </div>
  `,
})
export class DsStatCardComponent {
  @Input({ required: true }) data!: StatCardData;

  get valueClass(): string {
    const map: Record<string, string> = {
      positive: 'text-emerald-500',
      negative: 'text-red-500',
      warning:  'text-amber-500',
      brand:    'text-brand-500',
      default:  'text-slate-800 dark:text-slate-100',
    };
    return map[this.data.tone ?? 'default'];
  }

  get progressBarClass(): string {
    const map: Record<string, string> = {
      positive: 'bg-emerald-500',
      negative: 'bg-red-500',
      warning:  'bg-amber-500',
      brand:    'bg-brand-500',
    };
    return map[this.data.progressTone ?? 'brand'];
  }
}
