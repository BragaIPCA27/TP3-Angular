import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { MarketMovers, SectorPerf, NewsArticle } from '../models/market.model';

@Injectable({ providedIn: 'root' })
export class MarketApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getMovers(): Observable<MarketMovers> {
    return this.http.get<MarketMovers>(`${this.base}/movers`).pipe(
      catchError(() => of<MarketMovers>({ gainers: [], losers: [] }))
    );
  }

  getSectorPerf(): Observable<SectorPerf[]> {
    return this.http.get<SectorPerf[]>(`${this.base}/sector-perf`).pipe(
      catchError(() => of<SectorPerf[]>([]))
    );
  }

  getNews(ticker: string): Observable<NewsArticle[]> {
    return this.http.get<NewsArticle[]>(`${this.base}/news/${encodeURIComponent(ticker)}`).pipe(
      catchError(() => of<NewsArticle[]>([]))
    );
  }

  getMarketNews(): Observable<NewsArticle[]> {
    return this.http.get<NewsArticle[]>(`${this.base}/market-news`).pipe(
      catchError(() => of<NewsArticle[]>([]))
    );
  }
}
