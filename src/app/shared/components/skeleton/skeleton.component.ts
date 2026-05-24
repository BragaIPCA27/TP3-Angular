import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class]="'animate-pulse rounded-md bg-slate-200 dark:bg-slate-700 ' + extraClass"
      [style.width]="width"
      [style.height]="height">
    </div>
  `,
})
export class SkeletonComponent {
  @Input() width  = '100%';
  @Input() height = '1rem';
  @Input() extraClass = '';
}
