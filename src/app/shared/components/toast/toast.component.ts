import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-20 right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
      @for (toast of ns.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-card-lg animate-slide-up"
          [ngClass]="{
            'bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800': toast.type === 'success',
            'bg-white dark:bg-slate-800 border-red-200 dark:border-red-800':     toast.type === 'danger',
            'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800': toast.type === 'warning',
            'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800':   toast.type === 'info'
          }">
          <i class="bi text-base mt-0.5 flex-shrink-0"
            [ngClass]="{
              'bi-check-circle-fill text-emerald-500': toast.type === 'success',
              'bi-x-circle-fill text-red-500':         toast.type === 'danger',
              'bi-exclamation-triangle-fill text-amber-500': toast.type === 'warning',
              'bi-info-circle-fill text-blue-500':     toast.type === 'info'
            }">
          </i>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{{ toast.title }}</p>
            <p *ngIf="toast.message" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ toast.message }}</p>
          </div>
          <button
            class="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            (click)="ns.dismiss(toast.id)">
            <i class="bi bi-x text-base"></i>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  readonly ns = inject(NotificationService);
}
