import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StockQuoteResponse, QuoteData } from '../models/stock.model';
import { StockCandleResponse } from '../models/chart.model';

@Injectable({ providedIn: 'root' })
export class StockApiService {
  private readonly http = inject(HttpClient);

  getQuote(symbol: string): Observable<StockQuoteResponse> {
    const params = new HttpParams().set('symbol', symbol.toUpperCase());
    return this.http
      .get<StockQuoteResponse>(`${environment.apiBaseUrl}/quote`, { params })
      .pipe(map(r => ({
        c: Number(r?.c ?? 0), d: Number(r?.d ?? 0), dp: Number(r?.dp ?? 0),
        h: Number(r?.h ?? 0), l: Number(r?.l ?? 0), o: Number(r?.o ?? 0),
        pc: Number(r?.pc ?? 0), t: Number(r?.t ?? 0),
      })));
  }

  getCandles(symbol: string, resolution: '5' | '15' | 'D', from: number, to: number): Observable<StockCandleResponse> {
    const params = new HttpParams()
      .set('symbol', symbol.toUpperCase())
      .set('resolution', resolution)
      .set('from', from)
      .set('to', to);

    return this.http.get<StockCandleResponse>(`${environment.apiBaseUrl}/candles`, { params }).pipe(
      map(r => ({
        c: Array.isArray(r?.c) ? r.c.map(Number) : [],
        h: Array.isArray(r?.h) ? r.h.map(Number) : [],
        l: Array.isArray(r?.l) ? r.l.map(Number) : [],
        o: Array.isArray(r?.o) ? r.o.map(Number) : [],
        s: String(r?.s ?? 'no_data'),
        t: Array.isArray(r?.t) ? r.t.map(Number) : [],
        v: Array.isArray(r?.v) ? r.v.map(Number) : [],
      }))
    );
  }

  toQuoteData(r: StockQuoteResponse): QuoteData {
    return {
      price: r.c, change: r.d, changePercent: r.dp,
      high: r.h, low: r.l, open: r.o, previousClose: r.pc,
      updatedAt: new Date().toISOString(),
    };
  }
}
