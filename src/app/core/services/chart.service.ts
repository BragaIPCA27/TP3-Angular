import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map, of, catchError, shareReplay } from 'rxjs';
import { StockApiService } from '../api/stock-api.service';
import { ChartRange, ChartSnapshot, CandlePoint, StockCandleResponse } from '../models/chart.model';
import { StockQuoteResponse } from '../models/stock.model';

interface HistoryEntry { x: number; c: number; d: number; dp: number; h: number; l: number; o: number; pc: number; }

interface CacheEntry {
  data: Observable<CandlePoint[]>;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class ChartService {
  private readonly stockApi = inject(StockApiService);
  private readonly cache    = new Map<string, CacheEntry>();
  private readonly history  = new Map<string, HistoryEntry[]>();

  /* 1W uses daily candles (free tier doesn't reliably serve 15-min intraday) */
  private readonly resolutionFor: Record<ChartRange, '5' | '15' | 'D'> = {
    '1D': '5', '1W': 'D', '1M': 'D', '3M': 'D', '1Y': 'D',
  };

  private readonly windowSeconds: Record<ChartRange, number> = {
    '1D': 86400, '1W': 604800, '1M': 2592000, '3M': 7776000, '1Y': 31536000,
  };

  private readonly cacheTtlMs: Record<ChartRange, number> = {
    '1D': 5 * 60_000, '1W': 15 * 60_000, '1M': 60 * 60_000, '3M': 60 * 60_000, '1Y': 60 * 60_000,
  };

  loadSnapshot(symbol: string, range: ChartRange): Observable<ChartSnapshot> {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return of(this.emptySnapshot(sym, range));

    return combineLatest([
      this.getCandlesCached(sym, range),
      this.stockApi.getQuote(sym).pipe(
        catchError(() => of<StockQuoteResponse>({ c: 0, d: 0, dp: 0, h: 0, l: 0, o: 0, pc: 0, t: 0 }))
      ),
    ]).pipe(
      map(([candles, quote]) => {
        this.pushHistory(sym, quote);

        const points = candles.length >= 2
          ? this.mergeLastPoint(candles, quote)
          : this.buildFallbackPoints(sym, range, quote);

        const cur = quote.c || quote.pc || 0;
        return {
          symbol: sym,
          range,
          points,
          statistics: {
            currentPrice:  this.r(cur),
            openPrice:     this.r(quote.o || cur),
            highPrice:     this.r(quote.h || cur),
            lowPrice:      this.r(quote.l || cur),
            previousClose: this.r(quote.pc || cur),
            volume:        0,
            changePercent: this.r(quote.dp ?? 0),
          },
        };
      })
    );
  }

  private getCandlesCached(sym: string, range: ChartRange): Observable<CandlePoint[]> {
    const key = `${sym}:${range}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) return cached.data;

    const now  = Math.floor(Date.now() / 1000);
    const from = now - this.windowSeconds[range];

    const obs = this.stockApi.getCandles(sym, this.resolutionFor[range], from, now).pipe(
      map(r => this.candlesToPoints(r)),
      catchError(() => of<CandlePoint[]>([])),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.cache.set(key, { data: obs, expiresAt: Date.now() + this.cacheTtlMs[range] });
    return obs;
  }

  private candlesToPoints(r: StockCandleResponse): CandlePoint[] {
    if (!r.t?.length || r.s !== 'ok') return [];
    return r.t.map((t, i) => ({
      x: t * 1000,
      y: [
        this.r(r.o[i] ?? 0),
        this.r(r.h[i] ?? 0),
        this.r(r.l[i] ?? 0),
        this.r(r.c[i] ?? 0),
      ] as [number, number, number, number],
      volume: Math.round(r.v?.[i] ?? 0),
    }));
  }

  private mergeLastPoint(points: CandlePoint[], quote: StockQuoteResponse): CandlePoint[] {
    const cur = quote.c || quote.pc || 0;
    if (!cur) return points;
    const last = points[points.length - 1];
    const updated: CandlePoint = {
      x: last.x,
      y: [last.y[0], Math.max(last.y[1], this.r(cur)), Math.min(last.y[2], this.r(cur)), this.r(cur)],
      volume: last.volume,
    };
    return [...points.slice(0, -1), updated];
  }

  private pushHistory(sym: string, q: StockQuoteResponse): void {
    const arr = this.history.get(sym) ?? [];
    arr.push({ x: Date.now(), c: q.c, d: q.d, dp: q.dp, h: q.h, l: q.l, o: q.o, pc: q.pc });
    this.history.set(sym, arr.slice(-500));
  }

  /**
   * Fallback when the candle API returns no data (e.g. free-tier rate limit or
   * market closed). For 1D we synthesize prev-close → current so the chart
   * shows at least the daily direction immediately.  For other ranges we use
   * the accumulated in-memory poll history.
   */
  private buildFallbackPoints(sym: string, range: ChartRange, quote: StockQuoteResponse): CandlePoint[] {
    const cur  = this.r(quote.c  || quote.pc || 0);
    const prev = this.r(quote.pc || cur);

    if (range === '1D' && cur > 0) {
      const now  = Date.now();
      /* Place prev-close ~7.5 hours ago (approximate NY market-open offset) */
      const open = now - 7.5 * 3600_000;
      const mid  = now - 3.75 * 3600_000;
      const hi   = this.r(quote.h || Math.max(prev, cur));
      const lo   = this.r(quote.l || Math.min(prev, cur));
      return [
        { x: open, y: [prev, prev, prev, prev], volume: 0 },
        { x: mid,  y: [prev, hi,   lo,   this.r(quote.o || prev)], volume: 0 },
        { x: now,  y: [this.r(quote.o || prev), hi, lo, cur], volume: 0 },
      ];
    }

    const arr    = this.history.get(sym) ?? [];
    if (!arr.length) return [];

    const windowMs = this.windowSeconds[range] * 1000;
    const cutoff   = Date.now() - windowMs;
    const filtered = arr.filter(e => e.x >= cutoff);
    const limit    = ({ '1D': 48, '1W': 96, '1M': 120, '3M': 180, '1Y': 240 } as const)[range];
    const src      = filtered.length >= 2 ? filtered : arr.slice(-limit);

    return src.map((e, i) => {
      const c = this.r(e.c || e.pc || 0);
      const o = this.r(e.o || (i > 0 ? src[i - 1].c : c));
      return {
        x: e.x,
        y: [o, this.r(e.h || Math.max(o, c)), this.r(e.l || Math.min(o, c)), c] as [number, number, number, number],
        volume: Math.round(Math.abs(e.d) * 1000),
      };
    });
  }

  private emptySnapshot(sym: string, range: ChartRange): ChartSnapshot {
    return {
      symbol: sym, range, points: [],
      statistics: { currentPrice: 0, openPrice: 0, highPrice: 0, lowPrice: 0, previousClose: 0, volume: 0, changePercent: 0 },
    };
  }

  private r(v: number): number { return Math.round(Number(v || 0) * 100) / 100; }
}
