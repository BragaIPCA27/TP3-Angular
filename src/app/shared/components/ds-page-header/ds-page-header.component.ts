import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ds-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="ds-page-title">{{ title }}</h1>
        @if (subtitle) {
          <p class="ds-page-subtitle">{{ subtitle }}</p>
        }
      </div>
      <ng-content></ng-content>
    </div>
  `,
})
export class DsPageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
}
