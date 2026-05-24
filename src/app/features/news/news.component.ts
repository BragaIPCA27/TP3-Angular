import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, timer } from 'rxjs';
import { MarketApiService } from '../../core/api/market-api.service';
import { NewsArticle } from '../../core/models/market.model';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './news.component.html',
})
export class NewsComponent implements OnInit {
  private readonly marketApi  = inject(MarketApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly marketNews    = signal<NewsArticle[]>([]);
  readonly companyNews   = signal<NewsArticle[]>([]);
  readonly marketLoading = signal(true);
  readonly companyLoading = signal(false);
  readonly tickerInput   = signal('');
  readonly activeTicker  = signal('');

  readonly displayNews = computed(() =>
    this.activeTicker() ? this.companyNews() : this.marketNews()
  );

  readonly isLoading = computed(() =>
    this.activeTicker() ? this.companyLoading() : this.marketLoading()
  );

  ngOnInit(): void {
    timer(0, 15 * 60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.loadMarketNews());
  }

  async searchTicker(): Promise<void> {
    const t = this.tickerInput().trim().toUpperCase();
    if (!t) { this.activeTicker.set(''); return; }
    this.activeTicker.set(t);
    this.companyLoading.set(true);
    this.companyNews.set([]);
    try {
      const articles = await firstValueFrom(this.marketApi.getNews(t));
      this.companyNews.set(Array.isArray(articles) ? articles : []);
    } catch { this.companyNews.set([]); }
    finally { this.companyLoading.set(false); }
  }

  clearSearch(): void {
    this.tickerInput.set('');
    this.activeTicker.set('');
    this.companyNews.set([]);
  }

  timeAgo(timestamp: number): string {
    const s = Math.floor(Date.now() / 1000 - timestamp);
    if (s < 3600)  return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  }

  private async loadMarketNews(): Promise<void> {
    this.marketLoading.set(true);
    try {
      const articles = await firstValueFrom(this.marketApi.getMarketNews());
      this.marketNews.set(Array.isArray(articles) ? articles : []);
    } catch { /* silent */ }
    finally { this.marketLoading.set(false); }
  }
}
