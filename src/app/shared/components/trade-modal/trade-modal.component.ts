import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyFmtPipe } from '../../pipes/currency-fmt.pipe';

export type TradeMode = 'buy' | 'sell';

export interface TradePayload {
  ticker: string;
  quantity: number;
  mode: TradeMode;
}

@Component({
  selector: 'app-trade-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFmtPipe],
  templateUrl: './trade-modal.component.html',
})
export class TradeModalComponent implements OnChanges {
  @Input() open     = false;
  @Input() loading  = false;
  @Input() mode: TradeMode = 'buy';
  @Input() balance  = 0;
  @Input() initialTicker = '';
  @Output() closeModal = new EventEmitter<void>();
  @Output() confirm    = new EventEmitter<TradePayload>();

  ticker   = '';
  quantity = 1;
  activeMode: TradeMode = 'buy';

  get isBuy(): boolean { return this.activeMode === 'buy'; }
  get total(): number  { return this.quantity * 0; }

  ngOnChanges(): void {
    if (this.open) {
      this.activeMode = this.mode;
      this.ticker = this.initialTicker;
      this.quantity = 1;
    }
  }

  setMode(m: TradeMode): void { this.activeMode = m; }

  submit(): void {
    if (!this.ticker.trim() || this.quantity <= 0) return;
    this.confirm.emit({ ticker: this.ticker.trim().toUpperCase(), quantity: this.quantity, mode: this.activeMode });
  }

  close(): void { this.closeModal.emit(); }
}
