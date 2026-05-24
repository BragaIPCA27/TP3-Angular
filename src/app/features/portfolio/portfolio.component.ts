import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { PortfolioStore } from '../../core/store/portfolio.store';
import { PositionsTableComponent } from './components/positions-table/positions-table.component';
import { TradeModalComponent, TradeMode, TradePayload } from '../../shared/components/trade-modal/trade-modal.component';
import { AddPositionModalComponent, AddPositionPayload } from './components/add-position-modal/add-position-modal.component';
import { PerfChartComponent } from '../../shared/charts/perf-chart/perf-chart.component';
import { CurrencyFmtPipe } from '../../shared/pipes/currency-fmt.pipe';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, CurrencyFmtPipe, PositionsTableComponent, TradeModalComponent, AddPositionModalComponent, PerfChartComponent],
  templateUrl: './portfolio.component.html',
})
export class PortfolioComponent implements OnInit {
  readonly store = inject(PortfolioStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly showTrade      = signal(false);
  readonly showAdd        = signal(false);
  readonly tradeMode      = signal<TradeMode>('buy');
  readonly tradeTicker    = signal('');
  readonly selectedTicker = signal('SPY');

  ngOnInit(): void {
    /* Keep quotes live while the user is on this page — same cadence as dashboard */
    timer(60_000, 60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.store.refreshQuotes(true));
  }

  openTrade(mode: TradeMode, ticker = ''): void {
    this.tradeMode.set(mode);
    this.tradeTicker.set(ticker);
    this.showTrade.set(true);
  }

  async onConfirmTrade(p: TradePayload): Promise<void> {
    if (p.mode === 'buy') await this.store.buyStock(p.ticker, p.quantity);
    else                  await this.store.sellStock(p.ticker, p.quantity);
    this.showTrade.set(false);
  }

  async onConfirmAdd(p: AddPositionPayload): Promise<void> {
    await this.store.addPosition(p.ticker, p.company, p.acquiredAt, p.quantity, p.purchasePrice);
    this.showAdd.set(false);
  }

  onSelectTicker(ticker: string): void {
    this.selectedTicker.set(ticker);
  }
}
