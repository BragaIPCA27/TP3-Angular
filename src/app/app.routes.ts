import { Routes } from '@angular/router';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'portfolio',
        loadComponent: () => import('./features/portfolio/portfolio.component').then(m => m.PortfolioComponent),
      },
      {
        path: 'watchlist',
        loadComponent: () => import('./features/watchlist/watchlist.component').then(m => m.WatchlistComponent),
      },
      {
        path: 'trading',
        loadComponent: () => import('./features/trading/trading.component').then(m => m.TradingComponent),
      },
      {
        path: 'transactions',
        loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent),
      },
      {
        path: 'stocks',
        loadComponent: () => import('./features/stocks/stocks.component').then(m => m.StocksComponent),
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent),
      },
      {
        path: 'screener',
        loadComponent: () => import('./features/screener/screener.component').then(m => m.ScreenerComponent),
      },
      {
        path: 'market',
        loadComponent: () => import('./features/market/market.component').then(m => m.MarketComponent),
      },
      {
        path: 'news',
        loadComponent: () => import('./features/news/news.component').then(m => m.NewsComponent),
      },
      {
        path: 'alerts',
        loadComponent: () => import('./features/alerts/alerts.component').then(m => m.AlertsComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
