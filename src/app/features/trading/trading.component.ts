import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioStore } from '../../core/store/portfolio.store';
import { OrderType, OrderSide, Order } from '../../core/models/order.model';
import { calcPositionSize, calcRiskReward, calcExpectedValue, maxSharesAffordable } from '../../core/finance/math';
import { TickerLogoComponent } from '../../shared/components/ticker-logo/ticker-logo.component';

type Tab = 'order' | 'pending' | 'history' | 'sizing';

@Component({
  selector: 'app-trading',
  standalone: true,
  imports: [CommonModule, FormsModule, TickerLogoComponent],
  templateUrl: './trading.component.html',
})
export class TradingComponent {
  readonly store = inject(PortfolioStore);

  readonly Math = Math;

  // Tab
  readonly activeTab = signal<Tab>('order');

  // Order form
  ticker      = '';
  side        = signal<OrderSide>('buy');
  orderType   = signal<OrderType>('market');
  quantity    = 1;
  limitPrice  = 0;
  stopPrice   = 0;
  trailPct    = 1;

  // Position sizing calculator
  sizingRiskPct  = 1;
  sizingEntry    = 0;
  sizingStop     = 0;
  sizingWinRate  = 55;

  readonly orderTypes: { value: OrderType; label: string; desc: string }[] = [
    { value: 'market',       label: 'Mercado',        desc: 'Execução imediata ao preço atual' },
    { value: 'limit',        label: 'Limite',         desc: 'Executa apenas ao preço ou melhor' },
    { value: 'stop',         label: 'Stop',           desc: 'Trigger ao atingir preço de stop' },
    { value: 'stop_limit',   label: 'Stop-Limite',    desc: 'Stop + execução com limite' },
    { value: 'take_profit',  label: 'Take Profit',    desc: 'Venda automática ao alvo de lucro' },
    { value: 'trailing_stop',label: 'Trailing Stop',  desc: 'Stop dinâmico seguindo o preço' },
  ];

  readonly showLimit = computed(() =>
    ['limit', 'stop_limit', 'take_profit'].includes(this.orderType())
  );
  readonly showStop = computed(() =>
    ['stop', 'stop_limit'].includes(this.orderType())
  );
  readonly showTrail = computed(() => this.orderType() === 'trailing_stop');

  readonly currentQuote = computed(() => {
    const t = this.ticker.trim().toUpperCase();
    return this.store.quotes()[t] ?? null;
  });

  readonly maxAffordable = computed(() => {
    const q = this.currentQuote();
    if (!q) return 0;
    const price = this.orderType() === 'limit' ? (this.limitPrice || q.price) : q.price;
    return maxSharesAffordable(this.store.summary().balance, price);
  });

  readonly estimatedCost = computed(() => {
    const q = this.currentQuote();
    if (!q) return 0;
    const price = this.limitPrice > 0 ? this.limitPrice : q.price;
    return price * this.quantity;
  });

  readonly sizingResult = computed(() => {
    if (!this.sizingEntry || !this.sizingStop) return null;
    const res = calcPositionSize({
      accountBalance: this.store.summary().accountValue,
      riskPercent: this.sizingRiskPct,
      entryPrice: this.sizingEntry,
      stopLossPrice: this.sizingStop,
    });
    const rr = calcRiskReward(this.sizingEntry, this.sizingStop, this.sizingEntry + Math.abs(this.sizingEntry - this.sizingStop) * 2);
    const ev = calcExpectedValue(this.sizingWinRate, rr, res.riskAmount);
    return { ...res, rr, ev };
  });

  async submitOrder(): Promise<void> {
    const t = this.ticker.trim().toUpperCase();
    if (!t) return;
    await this.store.placeOrder({
      ticker: t,
      side: this.side(),
      type: this.orderType(),
      quantity: this.quantity,
      limitPrice: this.showLimit() ? this.limitPrice : undefined,
      stopPrice: this.showStop() ? this.stopPrice : undefined,
      trailPercent: this.showTrail() ? this.trailPct : undefined,
    });
    this.activeTab.set(this.orderType() === 'market' ? 'history' : 'pending');
  }

  cancelOrder(id: string): void {
    this.store.cancelOrder(id);
  }

  setMaxQty(): void {
    this.quantity = this.maxAffordable();
  }

  orderStatusClass(status: Order['status']): string {
    switch (status) {
      case 'pending':   return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'filled':    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'cancelled': return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
      case 'rejected':  return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return '';
    }
  }

  orderTypeLabel(type: OrderType): string {
    return this.orderTypes.find(o => o.value === type)?.label ?? type;
  }

  fmtPrice(v: number): string {
    if (!v) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
  }

  get currentOrderTypeDesc(): string {
    return this.orderTypes.find(o => o.value === this.orderType())?.desc ?? '';
  }

  fmtDate(iso: string): string {
    return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
  }
}
