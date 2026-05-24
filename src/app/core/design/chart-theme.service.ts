import { Injectable, inject } from '@angular/core';
import { ThemeService } from '../services/theme.service';

/**
 * Single source of truth for all ApexCharts configuration.
 * Every chart in the app must derive its options from this service
 * to guarantee visual and UX consistency across the platform.
 */
@Injectable({ providedIn: 'root' })
export class ChartThemeService {
  private readonly theme = inject(ThemeService);

  /* ── Design tokens ────────────────────────────────────────── */
  static readonly PALETTE  = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#14b8a6','#a3e635'];
  static readonly POS      = '#10b981';
  static readonly NEG      = '#ef4444';
  static readonly BRAND    = '#3b82f6';
  static readonly WARN     = '#f59e0b';
  static readonly PURPLE   = '#8b5cf6';
  static readonly CYAN     = '#06b6d4';
  static readonly FONT     = 'Inter, system-ui, sans-serif';

  /* ── Theme helpers ────────────────────────────────────────── */
  get isDark(): boolean { return this.theme.isDark(); }

  axisColor(dark: boolean)   { return dark ? '#475569' : '#94a3b8'; }
  gridColor(dark: boolean)   { return dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; }
  tooltipTheme(dark: boolean): 'dark' | 'light' { return dark ? 'dark' : 'light'; }

  /* ── Private base blocks ──────────────────────────────────── */
  private chart(type: string, height: number) {
    return {
      type, height,
      background: 'transparent',
      fontFamily: ChartThemeService.FONT,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, speed: 380, easing: 'easeinout' as const, dynamicAnimation: { speed: 300 } },
    };
  }

  private grid(dark: boolean, padding: Record<string, number> = { left: 4, right: 4, top: 4, bottom: 0 }) {
    return {
      borderColor: this.gridColor(dark),
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding,
    };
  }

  private xAxis(dark: boolean, type: 'datetime' | 'category' = 'category') {
    return {
      type,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: this.axisColor(dark), fontSize: '11px', fontFamily: ChartThemeService.FONT },
        ...(type === 'datetime' ? { datetimeUTC: false } : {}),
      },
    };
  }

  private yAxis(dark: boolean, opts: { formatter?: (v: number) => string; opposite?: boolean; show?: boolean } = {}) {
    return {
      opposite: opts.opposite ?? false,
      ...(opts.show === false ? { labels: { show: false } } : {
        labels: {
          style: { colors: this.axisColor(dark), fontSize: '11px', fontFamily: ChartThemeService.FONT },
          ...(opts.formatter ? { formatter: opts.formatter } : {}),
        },
      }),
    };
  }

  private tooltip(dark: boolean, extra: Record<string, unknown> = {}) {
    return {
      theme: this.tooltipTheme(dark),
      style: { fontSize: '12px', fontFamily: ChartThemeService.FONT },
      ...extra,
    };
  }

  /* ── Public builders ──────────────────────────────────────── */

  /** Area / line chart with optional gradient fill */
  line(dark: boolean, height = 320, opts: {
    datetimeX?: boolean;
    yFormatter?: (v: number) => string;
    yOpposite?: boolean;
    yMin?: number;
    yMax?: number;
  } = {}): any {
    return {
      chart:       this.chart('area', height),
      grid:        this.grid(dark),
      xaxis:       this.xAxis(dark, opts.datetimeX !== false ? 'datetime' : 'category'),
      yaxis:       {
        ...this.yAxis(dark, {
          opposite: opts.yOpposite ?? true,
          formatter: opts.yFormatter ?? ((v) => `$${v?.toFixed(0)}`),
        }),
        ...(opts.yMin !== undefined ? { min: opts.yMin, max: opts.yMax } : {}),
      },
      tooltip:     this.tooltip(dark, { x: { format: 'dd MMM HH:mm' } }),
      dataLabels:  { enabled: false },
      legend:      { show: false },
      stroke:      { curve: 'smooth' as const, width: 2 },
      markers:     { size: 0, hover: { size: 4 } },
      fill: {
        type: 'gradient',
        gradient: { shade: dark ? 'dark' : 'light', type: 'vertical', opacityFrom: dark ? 0.20 : 0.12, opacityTo: 0.01 },
      },
    };
  }

  /** Bar / column chart */
  bar(dark: boolean, height = 260, opts: {
    horizontal?: boolean;
    distributed?: boolean;
    yFormatter?: (v: number) => string;
    xCategories?: string[];
    tooltipFormatter?: (v: number) => string;
  } = {}): any {
    return {
      chart:        this.chart('bar', height),
      grid:         this.grid(dark),
      xaxis:        {
        ...this.xAxis(dark, 'category'),
        ...(opts.xCategories ? { categories: opts.xCategories } : {}),
      },
      yaxis:        this.yAxis(dark, { formatter: opts.yFormatter }),
      tooltip:      this.tooltip(dark, opts.tooltipFormatter ? { y: { formatter: opts.tooltipFormatter } } : {}),
      dataLabels:   { enabled: false },
      legend:       { show: false },
      plotOptions:  {
        bar: {
          horizontal:   opts.horizontal ?? false,
          borderRadius: 4,
          distributed:  opts.distributed ?? true,
          columnWidth:  '55%',
        },
      },
    };
  }

  /** Candlestick chart */
  candlestick(dark: boolean, height = 320, opts: { indicators?: boolean } = {}): any {
    return {
      chart:        this.chart('candlestick', height),
      grid:         this.grid(dark),
      xaxis:        this.xAxis(dark, 'datetime'),
      yaxis:        this.yAxis(dark, { opposite: true, formatter: (v) => `$${v?.toFixed(0)}` }),
      tooltip:      this.tooltip(dark, { x: { format: 'dd MMM HH:mm' } }),
      dataLabels:   { enabled: false },
      legend:       { show: !!opts.indicators, labels: { colors: this.axisColor(dark) }, position: 'top' as const, horizontalAlign: 'right' as const },
      plotOptions:  { candlestick: { colors: { upward: ChartThemeService.POS, downward: ChartThemeService.NEG }, wick: { useFillColor: true } } },
    };
  }

  /** Donut / pie chart */
  donut(dark: boolean, height = 260, opts: {
    donutSize?: string;
    centerLabel?: string;
    centerFormatter?: () => string;
  } = {}): any {
    const axis = this.axisColor(dark);
    const valColor = dark ? '#f1f5f9' : '#1e293b';
    return {
      chart:       this.chart('donut', height),
      dataLabels:  { enabled: false },
      tooltip:     this.tooltip(dark),
      legend:      { show: true, position: 'bottom' as const, labels: { colors: axis }, fontSize: '12px', fontFamily: ChartThemeService.FONT },
      stroke:      { width: 0 },
      colors:      ChartThemeService.PALETTE,
      plotOptions: {
        pie: {
          donut: {
            size: opts.donutSize ?? '60%',
            labels: {
              show: !!opts.centerLabel,
              total: opts.centerLabel
                ? { show: true, label: opts.centerLabel, color: axis, fontSize: '12px', formatter: opts.centerFormatter ?? (() => '') }
                : { show: false },
              value: { color: valColor, fontSize: '18px', fontWeight: '800' },
            },
          },
        },
      },
    };
  }

  /** Volume bars (compact, no y-axis labels) */
  volume(dark: boolean, height = 72): any {
    return {
      chart:       this.chart('bar', height),
      grid:        this.grid(dark, { top: 0, bottom: 0, left: 4, right: 4 }),
      xaxis:       this.xAxis(dark, 'datetime'),
      yaxis:       this.yAxis(dark, { show: false }),
      tooltip:     this.tooltip(dark, {
        x: { format: 'dd MMM HH:mm' },
        y: { formatter: (v: number) => v > 1e6 ? `${(v / 1e6).toFixed(1)}M` : v > 1e3 ? `${(v / 1e3).toFixed(0)}K` : `${v}` },
      }),
      dataLabels:  { enabled: false },
      plotOptions: { bar: { borderRadius: 1, columnWidth: '80%' } },
      colors:      [dark ? '#334155' : '#cbd5e1'],
    };
  }
}
