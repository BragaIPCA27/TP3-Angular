import { Component, Input, OnChanges, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { PortfolioPositionView } from '../../../core/models/portfolio.model';
import { ChartThemeService } from '../../../core/design/chart-theme.service';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { signal } from '@angular/core';
import { allocationWeight, totalMarketValue } from '../../../core/finance/math';

@Component({
  selector: 'app-allocation-donut',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, EmptyStateComponent],
  template: `
    <div class="ds-card">
      <div class="ds-card-header flex items-center gap-2">
        <i class="bi bi-pie-chart-fill text-brand-500"></i>
        <span class="ds-section-title">Alocação</span>
      </div>
      @if (positions.length) {
        <div class="px-2 pb-2">
          <apx-chart
            [series]="opts().series"
            [chart]="opts().chart"
            [labels]="opts().labels"
            [dataLabels]="opts().dataLabels"
            [legend]="opts().legend"
            [tooltip]="opts().tooltip"
            [plotOptions]="opts().plotOptions"
            [stroke]="opts().stroke"
            [colors]="opts().colors">
          </apx-chart>
        </div>
      } @else {
        <app-empty-state icon="pie-chart" title="Sem posições" subtitle="Adicione ações à sua carteira."></app-empty-state>
      }
    </div>
  `,
})
export class AllocationDonutComponent implements OnChanges {
  private readonly ct = inject(ChartThemeService);

  @Input({ required: true }) positions: PortfolioPositionView[] = [];

  private readonly _series = signal<number[]>([]);
  private readonly _labels = signal<string[]>([]);

  readonly opts = computed((): any => {
    const dark  = this.ct.isDark;
    const n     = this.positions.length;
    const base  = this.ct.donut(dark, 260, {
      donutSize:       '60%',
      centerLabel:     'Total',
      centerFormatter: () => `${n} ativos`,
    });
    return { ...base, series: this._series(), labels: this._labels() };
  });

  ngOnChanges(): void {
    const total = totalMarketValue(this.positions.map(p => p.marketValue));
    if (total === 0) { this._series.set([]); this._labels.set([]); return; }
    const sorted = [...this.positions].sort((a, b) => b.marketValue - a.marketValue);
    const top    = sorted.slice(0, 9);
    const rest   = sorted.slice(9);
    const series = top.map(p => +allocationWeight(p.marketValue, total).toFixed(2));
    const labels = top.map(p => p.ticker);
    if (rest.length) {
      const othersWeight = rest.reduce((s, p) => s + allocationWeight(p.marketValue, total), 0);
      series.push(+othersWeight.toFixed(2));
      labels.push('Outros');
    }
    this._series.set(series);
    this._labels.set(labels);
  }
}
