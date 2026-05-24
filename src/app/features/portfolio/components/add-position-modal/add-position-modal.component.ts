import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AddPositionPayload {
  ticker: string;
  company: string;
  acquiredAt: string;
  quantity: number;
  purchasePrice: number;
}

@Component({
  selector: 'app-add-position-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-position-modal.component.html',
})
export class AddPositionModalComponent implements OnChanges {
  @Input() open    = false;
  @Input() loading = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() confirm    = new EventEmitter<AddPositionPayload>();

  ticker        = '';
  company       = '';
  quantity      = 1;
  purchasePrice = 0;
  acquiredAt    = new Date().toISOString().slice(0, 10);
  errors: Record<string, string> = {};

  ngOnChanges(): void {
    if (this.open) this.reset();
  }

  submit(): void {
    this.errors = {};
    if (!this.ticker.trim()) { this.errors['ticker'] = 'Obrigatório'; return; }
    if (!this.company.trim()) { this.errors['company'] = 'Obrigatório'; return; }
    if (this.quantity <= 0) { this.errors['quantity'] = 'Deve ser > 0'; return; }
    if (this.purchasePrice <= 0) { this.errors['price'] = 'Deve ser > 0'; return; }
    this.confirm.emit({ ticker: this.ticker.trim().toUpperCase(), company: this.company.trim(), acquiredAt: this.acquiredAt, quantity: this.quantity, purchasePrice: this.purchasePrice });
  }

  close(): void { this.closeModal.emit(); }

  private reset(): void {
    this.ticker = ''; this.company = ''; this.quantity = 1;
    this.purchasePrice = 0; this.acquiredAt = new Date().toISOString().slice(0, 10);
    this.errors = {};
  }
}
