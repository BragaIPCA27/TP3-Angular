import { Component, Input } from '@angular/core';

/**
 * Unified change / status badge.
 *
 * Usage:
 *   <ds-badge [value]="2.34" />               → green  +2.34%
 *   <ds-badge [value]="-1.2" />               → red    -1.20%
 *   <ds-badge [value]="5" variant="amount" /> → green  +$5.00
 *   <ds-badge label="ATIVO" variant="label" />
 */
@Component({
  selector: 'ds-badge',
  standalone: true,
  template: `<span class="ds-badge" [class]="cls">{{ text }}</span>`,
})
export class DsBadgeComponent {
  @Input() value = 0;
  @Input() variant: 'percent' | 'amount' | 'label' | 'neutral' = 'percent';
  @Input() label = '';
  @Input() decimals = 2;

  get positive(): boolean { return this.value >= 0; }

  get cls(): string {
    if (this.variant === 'label' || this.variant === 'neutral') return 'ds-badge-neutral';
    return this.positive ? 'ds-badge-up' : 'ds-badge-down';
  }

  get text(): string {
    if (this.variant === 'label') return this.label;
    if (this.variant === 'neutral') return this.label || String(this.value);
    const sign = this.positive ? '+' : '';
    if (this.variant === 'amount') return `${sign}$${Math.abs(this.value).toFixed(this.decimals)}`;
    return `${sign}${this.value.toFixed(this.decimals)}%`;
  }
}
