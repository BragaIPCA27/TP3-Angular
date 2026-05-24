import { Component, Input, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, map, of, shareReplay, switchMap, tap, timer } from 'rxjs';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ChartRange } from '../../../core/models/chart.model';
import { ChartService } from '../../../core/services/chart.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ChartThemeService } from '../../../core/design/chart-theme.service';
import { sma, ema } from '../../../core/finance/math';

export type ChartViewType = 'line' | 'candle';

@Component({
  selector: 'app-perf-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './perf-chart.component.html',
})
export class PerfChartComponent implements OnDestroy {
  private readonly chartService  = inject(ChartService);
  private readonly themeService  = inject(ThemeService);
  private readonly ct            = inject(ChartThemeService);

  private readonly sym$   = new BehaviorSubject('SPY');
  private readonly range$ = new BehaviorSubject<ChartRange>('1M');

  private readonly _yMin = signal<number | undefined>(undefined);
  private readonly _yMax = signal<number | undefined>(undefined);

  /* ── User-controlled state ── */
  readonly chartType  = signal<ChartViewType>('line');
  readonly showSMA20  = signal(false);
  readonly showSMA50  = signal(false);
  readonly showEMA20  = signal(false);
  readonly showVolume = signal(false);

  readonly ranges: ChartRange[] = ['1D', '1W', '1M', '3M', '1Y'];

  @Input() set symbol(v: string) { this.sym$.next(v?.trim().toUpperCase() || 'SPY'); }
  @Input() set range(v: ChartRange) { this.range$.next(v || '1M'); }

  /* ── Data pipeline ── */
  private readonly raw$ = combineLatest([this.sym$, this.range$, timer(0, 30_000)]).pipe(
    switchMap(([sym, range]) =>
      !sym ? of(null) : this.chartService.loadSnapshot(sym, range).pipe(
        tap(s => {
          const highs = s.points.map(p => p.y[1]).filter(v => v > 0);
          const lows  = s.points.map(p => p.y[2]).filter(v => v > 0);
          if (highs.length) {
            const lo = Math.min(...lows);
            const hi = Math.max(...highs);
            const pad = (hi - lo) || lo * 0.005;
            this._yMin.set(+(lo - pad * 0.4).toFixed(2));
            this._yMax.set(+(hi + pad * 0.4).toFixed(2));
          } else {
            this._yMin.set(undefined);
            this._yMax.set(undefined);
          }
        })
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly snapshot = toSignal(this.raw$, { initialValue: null });

  /* ── Derived data ── */
  readonly statistics  = computed(() => this.snapshot()?.statistics ?? null);
  readonly tickerLabel = computed(() => this.snapshot()?.symbol ?? this.sym$.value);

  readonly closePrices = computed(() =>
    (this.snapshot()?.points ?? []).map(p => ({ x: p.x, y: p.y[3] }))
  );
  readonly candleData = computed(() =>
    (this.snapshot()?.points ?? []).map(p => ({ x: p.x, y: p.y }))
  );
  readonly volumeData = computed(() =>
    (this.snapshot()?.points ?? []).map(p => ({ x: p.x, y: p.volume }))
  );

  /* ── Technical indicators ── */
  readonly sma20 = computed(() => sma(this.closePrices(), 20));
  readonly sma50 = computed(() => sma(this.closePrices(), 50));
  readonly ema20 = computed(() => ema(this.closePrices(), 20));

  /* ── Line chart: dual green/red area series ── */
  readonly dualSeries = computed(() => {
    const pts = this.closePrices();
    type DPt = { x: number; y: number | null };
    const green: DPt[] = pts.map(p => ({ x: p.x, y: null }));
    const red:   DPt[] = pts.map(p => ({ x: p.x, y: null }));
    pts.forEach((p, i) => {
      if (i === 0) { green[0] = { x: p.x, y: p.y }; return; }
      const prev = pts[i - 1].y;
      if (p.y >= prev) {
        green[i] = { x: p.x, y: p.y };
        if (green[i - 1].y === null) green[i - 1] = { x: pts[i - 1].x, y: pts[i - 1].y };
      } else {
        red[i] = { x: p.x, y: p.y };
        if (red[i - 1].y === null) red[i - 1] = { x: pts[i - 1].x, y: pts[i - 1].y };
      }
    });
    return [
      { name: 'Subida',  data: green },
      { name: 'Descida', data: red   },
    ];
  });

  /* ── Candle chart series (OHLCV + optional indicators) ── */
  readonly candleSeries = computed<any[]>(() => {
    const base: any[] = [{
      name: this.tickerLabel(),
      type: 'candlestick',
      data: this.candleData(),
    }];
    if (this.showSMA20()) base.push({ name: 'SMA 20', type: 'line', data: this.sma20() });
    if (this.showSMA50()) base.push({ name: 'SMA 50', type: 'line', data: this.sma50() });
    if (this.showEMA20()) base.push({ name: 'EMA 20', type: 'line', data: this.ema20() });
    return base;
  });

  readonly volumeSeries = computed(() => [{
    name: 'Volume',
    data: this.volumeData(),
  }]);

  /* ── Chart option computeds (via ChartThemeService) ── */
  readonly lineChartOpts = computed((): any => {
    const dark = this.themeService.isDark();
    return {
      ...this.ct.line(dark, 320, { yMin: this._yMin(), yMax: this._yMax() }),
      colors: [ChartThemeService.POS, ChartThemeService.NEG],
      tooltip: { theme: this.ct.tooltipTheme(dark), x: { format: 'dd MMM HH:mm' }, y: { formatter: (v: number) => v != null ? `$${v.toFixed(2)}` : '' }, shared: true },
    };
  });

  readonly candleChartOpts = computed((): any => {
    const dark   = this.themeService.isDark();
    const hasInd = this.showSMA20() || this.showSMA50() || this.showEMA20();
    return {
      ...this.ct.candlestick(dark, 320, { indicators: hasInd }),
      stroke: { width: [1, 1.5, 1.5, 1.5], curve: 'smooth' as const },
      colors: ['transparent', ChartThemeService.BRAND, ChartThemeService.WARN, ChartThemeService.PURPLE],
    };
  });

  readonly volumeChartOpts = computed((): any =>
    this.ct.volume(this.themeService.isDark(), 72)
  );

  /* ── Controls ── */
  readonly activeRange = computed(() => this.range$.value);

  setRange(r: ChartRange): void { this.range$.next(r); }
  toggleType(t: ChartViewType): void {
    this.chartType.set(t);
    if (t === 'line') {
      this.showSMA20.set(false);
      this.showSMA50.set(false);
      this.showEMA20.set(false);
    }
  }
  isRange(r: ChartRange): boolean { return this.range$.value === r; }

  ngOnDestroy(): void { this.sym$.complete(); this.range$.complete(); }
}
