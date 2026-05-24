import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { PortfolioStore } from '../../core/store/portfolio.store';
import { ChartThemeService } from '../../core/design/chart-theme.service';
import { AllocationDonutComponent } from '../../shared/charts/allocation-donut/allocation-donut.component';
import { CurrencyFmtPipe } from '../../shared/pipes/currency-fmt.pipe';
import { TickerLogoComponent } from '../../shared/components/ticker-logo/ticker-logo.component';
import { DsStatCardComponent, StatCardData } from '../../shared/components/ds-stat-card/ds-stat-card.component';
import { DsPageHeaderComponent } from '../../shared/components/ds-page-header/ds-page-header.component';
import {
  cagr,
  yearsElapsed,
  realizedPnL,
  portfolioVolatility,
  diversificationScore,
  maxConcentration,
  winRate,
  portfolioHealthScore,
} from '../../core/finance/math';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule, NgApexchartsModule, CurrencyFmtPipe,
    AllocationDonutComponent, TickerLogoComponent,
    DsStatCardComponent, DsPageHeaderComponent,
  ],
  templateUrl: './analytics.component.html',
})
export class AnalyticsComponent {
  readonly store = inject(PortfolioStore);
  private readonly ct   = inject(ChartThemeService);

  /* ── Risk & health metrics ── */
  readonly riskMetrics = computed(() => {
    const views = this.store.positionsView();
    if (!views.length) return null;
    const weights       = views.map(p => p.weight);
    const wr            = Math.round(winRate(views.map(p => p.profitLoss)));
    const concentration = Math.round(maxConcentration(weights));
    const divScore      = Math.round(diversificationScore(weights));
    const isProfitable  = this.store.summary().totalProfitLoss >= 0;
    const score         = portfolioHealthScore(wr, divScore, isProfitable);
    return { winRate: wr, concentration, diversification: divScore, score };
  });

  readonly bestPerformer  = computed(() =>
    [...this.store.positionsView()].sort((a, b) => b.profitLossPercent - a.profitLossPercent)[0] ?? null
  );
  readonly worstPerformer = computed(() =>
    [...this.store.positionsView()].sort((a, b) => a.profitLossPercent - b.profitLossPercent)[0] ?? null
  );

  /* ── Advanced analytics ── */
  readonly cagrValue = computed((): number | null => {
    const txs = this.store.transactions();
    if (!txs.length) return null;
    // txs is newest-first; last element is the oldest transaction
    const years = yearsElapsed(txs[txs.length - 1].timestamp);
    return cagr(this.store.summary().accountValue, 100_000, years);
  });

  readonly realizedPL = computed((): number =>
    realizedPnL(this.store.transactions())
  );

  readonly dailyVolatility = computed((): number | null =>
    portfolioVolatility(
      this.store.positionsView().map(p => ({
        weight:             p.weight,
        dailyReturnPercent: p.dailyChangePercent,
      })),
    )
  );

  /* ── Stat card data ── */
  readonly healthCards = computed((): StatCardData[] => {
    const rm = this.riskMetrics();
    if (!rm) return [];
    return [
      {
        label: 'Saúde Carteira', value: String(rm.score),
        subtext: this.scoreLabel(rm.score),
        tone: rm.score >= 70 ? 'positive' : rm.score >= 45 ? 'warning' : 'negative',
        progress: rm.score, progressTone: rm.score >= 70 ? 'positive' : rm.score >= 45 ? 'warning' : 'negative',
      },
      {
        label: 'Taxa de Acerto', value: `${rm.winRate}%`,
        subtext: 'posições lucrativas',
        tone: rm.winRate >= 50 ? 'positive' : rm.winRate >= 33 ? 'warning' : 'negative',
      },
      {
        label: 'Diversificação', value: `${rm.diversification}%`,
        subtext: 'índice HHI invertido',
        tone: rm.diversification >= 70 ? 'positive' : rm.diversification >= 40 ? 'warning' : 'negative',
      },
      {
        label: 'Concentração', value: `${rm.concentration}%`,
        subtext: 'maior posição',
        tone: rm.concentration < 30 ? 'positive' : rm.concentration < 60 ? 'warning' : 'negative',
      },
    ];
  });

  readonly advancedCards = computed((): StatCardData[] => {
    const s    = this.store.summary();
    const cagr = this.cagrValue();
    const rpl  = this.realizedPL();
    const vol  = this.dailyVolatility();
    return [
      {
        label: 'Resultado Aberto',
        value: `${s.totalProfitLoss >= 0 ? '+' : '-'}$${Math.abs(s.totalProfitLoss).toFixed(0)}`,
        subtext: 'posições em aberto',
        tone: s.totalProfitLoss >= 0 ? 'positive' : 'negative',
      },
      {
        label: 'P&L Realizado',
        value: rpl !== 0 ? `${rpl >= 0 ? '+' : '-'}$${Math.abs(rpl).toFixed(0)}` : '$0',
        subtext: 'posições encerradas',
        tone: rpl > 0 ? 'positive' : rpl < 0 ? 'negative' : 'default',
      },
      {
        label: 'CAGR',
        value: cagr !== null ? `${cagr >= 0 ? '+' : ''}${cagr.toFixed(1)}%` : '—',
        subtext: cagr !== null ? 'retorno anualizado' : 'dados insuficientes',
        tone: cagr === null ? 'default' : cagr >= 0 ? 'positive' : 'negative',
      },
      {
        label: 'Volatilidade Diária',
        value: vol !== null ? `${vol.toFixed(2)}%` : '—',
        subtext: vol !== null ? 'dispersão ponderada' : 'mín. 2 posições',
        tone: vol === null ? 'default' : vol < 1 ? 'positive' : vol < 2.5 ? 'warning' : 'negative',
      },
    ];
  });

  /* ── Chart options via ChartThemeService ── */
  readonly plBarOptions = computed((): any => {
    const dark  = this.ct.isDark;
    const views = this.store.positionsView();
    const fmtUsd = (v: number) => {
      const n = Number(v);
      return n < 0 ? `-$${Math.abs(n).toFixed(0)}` : `$${n.toFixed(0)}`;
    };
    const base  = this.ct.bar(dark, 260, {
      horizontal:       true,
      tooltipFormatter: fmtUsd,
    });
    return {
      ...base,
      xaxis: {
        ...base.xaxis,
        labels: {
          style: { colors: this.ct.axisColor(dark), fontSize: '11px' },
          formatter: fmtUsd,
        },
      },
      yaxis: {
        labels: {
          style: { colors: this.ct.axisColor(dark), fontSize: '11px' },
        },
      },
      colors: views.map(p => p.profitLoss >= 0 ? ChartThemeService.POS : ChartThemeService.NEG),
      series: [{ name: 'P&L', data: views.map(p => ({ x: p.ticker, y: Math.round(p.profitLoss) })) }],
    };
  });

  readonly dailyBarOptions = computed((): any => {
    const dark  = this.ct.isDark;
    const views = this.store.positionsView();
    return {
      ...this.ct.bar(dark, 260, {
        xCategories:      views.map(p => p.ticker),
        tooltipFormatter: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`,
        yFormatter:       (v: number) => `${v.toFixed(1)}%`,
      }),
      colors: views.map(p => p.dailyChangePercent >= 0 ? ChartThemeService.POS : ChartThemeService.NEG),
      series: [{ name: 'Var. Dia %', data: views.map(p => +p.dailyChangePercent.toFixed(2)) }],
    };
  });

  /* ── Helpers ── */
  scoreColor(score: number)  { return score >= 70 ? 'text-emerald-500' : score >= 45 ? 'text-amber-500' : 'text-red-500'; }
  scoreLabel(score: number)  { return score >= 70 ? 'Saudável' : score >= 45 ? 'Moderado' : 'Em risco'; }
  scoreBg(score: number)     { return score >= 70 ? 'bg-emerald-500' : score >= 45 ? 'bg-amber-500' : 'bg-red-500'; }
}
