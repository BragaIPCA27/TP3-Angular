import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../core/services/alert.service';
import { PortfolioStore } from '../../core/store/portfolio.store';
import { AlertCondition, PriceAlert } from '../../core/models/alert.model';
import { CurrencyFmtPipe } from '../../shared/pipes/currency-fmt.pipe';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFmtPipe],
  templateUrl: './alerts.component.html',
})
export class AlertsComponent {
  readonly alertService = inject(AlertService);
  readonly store        = inject(PortfolioStore);

  /* ── Form state ── */
  readonly formTicker    = signal('');
  readonly formCondition = signal<AlertCondition>('above');
  readonly formTarget    = signal<number | null>(null);
  readonly formNote      = signal('');
  readonly formError     = signal('');

  /* ── Filter ── */
  readonly activeTab = signal<'active' | 'triggered' | 'all'>('active');

  readonly displayedAlerts = computed(() => {
    const tab = this.activeTab();
    const all = this.alertService.alerts();
    if (tab === 'active')    return all.filter(a => a.status === 'active');
    if (tab === 'triggered') return all.filter(a => a.status === 'triggered');
    return all;
  });

  /* ── Lookup current price from quotes ── */
  currentPrice(ticker: string): number {
    return this.store.quotes()[ticker.toUpperCase()]?.price ?? 0;
  }

  /* ── Form submit ── */
  submit(): void {
    const ticker = this.formTicker().trim().toUpperCase();
    const target = this.formTarget();
    if (!ticker)       { this.formError.set('Ticker obrigatório.'); return; }
    if (!target || target <= 0) { this.formError.set('Preço-alvo inválido.'); return; }
    this.formError.set('');
    this.alertService.add(ticker, this.formCondition(), target, this.formNote() || undefined);
    this.formTicker.set('');
    this.formTarget.set(null);
    this.formNote.set('');
  }

  conditionLabel(a: PriceAlert): string {
    return a.condition === 'above' ? `≥ $${a.targetPrice.toFixed(2)}` : `≤ $${a.targetPrice.toFixed(2)}`;
  }

  relTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    const h = Math.floor(diff / 3_600_000);
    const d = Math.floor(diff / 86_400_000);
    if (d >= 1)  return `${d}d atrás`;
    if (h >= 1)  return `${h}h atrás`;
    if (m >= 1)  return `${m}m atrás`;
    return 'agora';
  }
}
