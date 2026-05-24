import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoverStock } from '../../../../core/models/market.model';
import { TickerLogoComponent } from '../../../../shared/components/ticker-logo/ticker-logo.component';

@Component({
  selector: 'app-market-movers',
  standalone: true,
  imports: [CommonModule, TickerLogoComponent],
  templateUrl: './market-movers.component.html',
})
export class MarketMoversComponent {
  @Input() gainers: MoverStock[] = [];
  @Input() losers: MoverStock[] = [];
  @Input() loading = false;

  readonly activeTab = signal<'gainers' | 'losers'>('gainers');

  get activeList(): MoverStock[] {
    return this.activeTab() === 'gainers' ? this.gainers : this.losers;
  }
}
