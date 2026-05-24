import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'danger' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly toasts = signal<Toast[]>([]);

  success(title: string, message = ''): void { this.push('success', title, message); }
  error(title: string, message = ''): void   { this.push('danger',  title, message); }
  warning(title: string, message = ''): void  { this.push('warning', title, message); }
  info(title: string, message = ''): void    { this.push('info',    title, message); }

  dismiss(id: string): void {
    this.toasts.update(ts => ts.filter(t => t.id !== id));
  }

  private push(type: ToastType, title: string, message: string): void {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.toasts.update(ts => [...ts, { id, type, title, message }]);
    setTimeout(() => this.dismiss(id), 4500);
  }
}
