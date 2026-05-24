import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div class="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <i [class]="'bi text-2xl text-slate-400 dark:text-slate-500 bi-' + icon"></i>
      </div>
      <p class="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">{{ title }}</p>
      <p class="text-xs text-slate-400 dark:text-slate-500 max-w-xs">{{ subtitle }}</p>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() icon     = 'inbox';
  @Input() title    = 'Sem dados';
  @Input() subtitle = '';
}
