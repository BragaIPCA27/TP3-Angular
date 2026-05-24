import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ds-section-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ds-card-header flex items-center justify-between">
      <div>
        <h3 class="ds-section-title">{{ title }}</h3>
        @if (subtitle) {
          <p class="ds-section-subtitle">{{ subtitle }}</p>
        }
      </div>
      <ng-content></ng-content>
    </div>
  `,
})
export class DsSectionHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
}
