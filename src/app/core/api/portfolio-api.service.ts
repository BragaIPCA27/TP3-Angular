import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PortfolioPosition } from '../models/portfolio.model';
import { Transaction } from '../models/transaction.model';
import { Order } from '../models/order.model';
import { ChartRange } from '../models/chart.model';

export interface PortfolioApiState {
  balance: number;
  positions: PortfolioPosition[];
  transactions: Transaction[];
  watchlist: string[];
  orders?: Order[];
  selectedTicker: string | null;
  chartRange: ChartRange;
}

@Injectable({ providedIn: 'root' })
export class PortfolioApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/portfolio`;

  load(): Observable<PortfolioApiState> {
    return this.http.get<PortfolioApiState>(this.base);
  }

  save(state: PortfolioApiState): Observable<PortfolioApiState> {
    return this.http.put<PortfolioApiState>(this.base, state);
  }

  reset(): Observable<PortfolioApiState> {
    return this.http.post<PortfolioApiState>(`${this.base}/reset`, {});
  }
}
