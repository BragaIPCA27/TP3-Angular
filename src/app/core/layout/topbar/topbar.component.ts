import { Component, DestroyRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { ThemeService } from '../../services/theme.service';
import { PortfolioStore } from '../../store/portfolio.store';
import { AuthStore } from '../../store/auth.store';
import { CurrencyFmtPipe } from '../../../shared/pipes/currency-fmt.pipe';

type MarketStatus = 'open' | 'pre' | 'after' | 'closed';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyFmtPipe],
  templateUrl: './topbar.component.html',
})
export class TopbarComponent {
  @Input() sidebarCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly router     = inject(Router);
  readonly theme  = inject(ThemeService);
  readonly store  = inject(PortfolioStore);
  readonly auth   = inject(AuthStore);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly clock         = signal('--:--:--');
  readonly marketStatus  = signal<MarketStatus>('closed');
  readonly marketLabel   = signal('FECHADO');

  readonly marketStatusConfig: Record<MarketStatus, { dot: string; badge: string; label: string }> = {
    open:   { dot: 'bg-emerald-400 animate-pulse-dot', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', label: 'NYSE ABERTO' },
    pre:    { dot: 'bg-amber-400',                      badge: 'border-amber-500/30 bg-amber-500/10 text-amber-400',     label: 'PRÉ-MERCADO' },
    after:  { dot: 'bg-amber-400',                      badge: 'border-amber-500/30 bg-amber-500/10 text-amber-400',     label: 'AFTER-HOURS' },
    closed: { dot: 'bg-slate-500',                      badge: 'border-slate-600/30 bg-slate-500/10 text-slate-400',     label: 'FECHADO'     },
  };

  constructor() {
    this.tick();
    interval(1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.tick());
  }

  submit(): void {
    const val = this.searchControl.value.trim().toUpperCase();
    if (!val) return;
    void this.router.navigate(['/stocks'], { queryParams: { ticker: val } });
    this.searchControl.reset();
  }

  get statusConfig() { return this.marketStatusConfig[this.marketStatus()]; }

  private tick(): void {
    const now = new Date();
    this.clock.set(now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const ny   = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day  = ny.getDay();
    const mins = ny.getHours() * 60 + ny.getMinutes();
    let status: MarketStatus;
    if (day === 0 || day === 6)         status = 'closed';
    else if (mins >= 570 && mins < 960) status = 'open';
    else if (mins >= 240 && mins < 570) status = 'pre';
    else if (mins >= 960 && mins < 1200) status = 'after';
    else                                status = 'closed';
    this.marketStatus.set(status);
    this.marketLabel.set(this.marketStatusConfig[status].label);
  }
}
