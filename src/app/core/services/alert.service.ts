import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { PriceAlert, AlertCondition } from '../models/alert.model';
import { PortfolioStore } from '../store/portfolio.store';
import { NotificationService } from './notification.service';

const STORAGE_KEY = 'ptv2-alerts';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly notifications = inject(NotificationService);
  private readonly store         = inject(PortfolioStore);

  private readonly _alerts = signal<PriceAlert[]>(this.load());

  readonly alerts          = this._alerts.asReadonly();
  readonly activeAlerts    = computed(() => this._alerts().filter(a => a.status === 'active'));
  readonly triggeredAlerts = computed(() => this._alerts().filter(a => a.status === 'triggered'));
  readonly activeCount     = computed(() => this.activeAlerts().length);

  constructor() {
    /* Check alerts whenever quotes update */
    effect(() => {
      const quotes = this.store.quotes();
      if (Object.keys(quotes).length) this.checkAlerts(quotes);
    });
    /* Request browser notification permission on first use */
    this.requestPermission();
  }

  add(ticker: string, condition: AlertCondition, targetPrice: number, note?: string): void {
    const alert: PriceAlert = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ticker: ticker.trim().toUpperCase(),
      condition,
      targetPrice,
      note,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    this._alerts.update(a => [alert, ...a]);
    this.persist();
  }

  remove(id: string): void {
    this._alerts.update(a => a.filter(x => x.id !== id));
    this.persist();
  }

  dismiss(id: string): void {
    this._alerts.update(a => a.map(x => x.id === id ? { ...x, status: 'dismissed' as const } : x));
    this.persist();
  }

  reactivate(id: string): void {
    this._alerts.update(a => a.map(x => x.id === id ? { ...x, status: 'active' as const, triggeredAt: undefined } : x));
    this.persist();
  }

  clearAll(): void {
    this._alerts.set([]);
    this.persist();
  }

  private checkAlerts(quotes: Record<string, { price: number }>): void {
    let changed = false;
    const updated = this._alerts().map(alert => {
      if (alert.status !== 'active') return alert;
      const q = quotes[alert.ticker];
      if (!q?.price) return alert;
      const hit = alert.condition === 'above'
        ? q.price >= alert.targetPrice
        : q.price <= alert.targetPrice;
      if (!hit) return alert;
      changed = true;
      this.notify(alert, q.price);
      return { ...alert, status: 'triggered' as const, triggeredAt: new Date().toISOString() };
    });
    if (changed) {
      this._alerts.set(updated);
      this.persist();
    }
  }

  private notify(alert: PriceAlert, price: number): void {
    const sign  = alert.condition === 'above' ? '≥' : '≤';
    const body  = `${alert.ticker} atingiu $${price.toFixed(2)} (alvo: ${sign} $${alert.targetPrice.toFixed(2)})`;
    this.notifications.info(`Alerta: ${alert.ticker}`, body);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Alerta de preço: ${alert.ticker}`, { body, icon: '/favicon.ico' });
    }
  }

  private requestPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._alerts())); } catch { /* ignore */ }
  }

  private load(): PriceAlert[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PriceAlert[]) : [];
    } catch { return []; }
  }
}
