import { Component, Input } from '@angular/core';

@Component({
  selector: 'ds-card',
  standalone: true,
  host: { '[class]': 'hostClass' },
  template: `<ng-content></ng-content>`,
})
export class DsCardComponent {
  /** Use 'flat' for rounded-xl without overflow-hidden (e.g. metric cards) */
  @Input() variant: 'default' | 'flat' = 'default';

  get hostClass(): string {
    return this.variant === 'flat'
      ? 'block ds-card-flat'
      : 'block ds-card';
  }
}
