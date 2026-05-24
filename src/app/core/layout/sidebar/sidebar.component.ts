import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLinkActive } from '@angular/router';
import { PortfolioStore } from '../../store/portfolio.store';
import { inject } from '@angular/core';
import { CurrencyFmtPipe } from '../../../shared/pipes/currency-fmt.pipe';

interface NavItem { path: string; label: string; icon: string; }
interface NavGroup { label: string; items: NavItem[]; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLinkActive, CurrencyFmtPipe],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  @Input()  collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  private readonly store = inject(PortfolioStore);
  readonly summary = this.store.summary;

  readonly navGroups: NavGroup[] = [
    {
      label: 'Principal',
      items: [
        { path: '/dashboard',    label: 'Dashboard',       icon: 'bi-grid-1x2-fill'    },
        { path: '/stocks',       label: 'Mercado',         icon: 'bi-graph-up-arrow'   },
        { path: '/market',       label: 'Mercado Global',  icon: 'bi-globe'            },
      ],
    },
    {
      label: 'Carteira',
      items: [
        { path: '/portfolio',    label: 'Posições',        icon: 'bi-briefcase-fill'   },
        { path: '/trading',      label: 'Trading',         icon: 'bi-lightning-charge-fill' },
        { path: '/transactions', label: 'Transações',      icon: 'bi-receipt'          },
        { path: '/watchlist',    label: 'Watchlist',       icon: 'bi-star-fill'        },
        { path: '/alerts',       label: 'Alertas',         icon: 'bi-bell-fill'        },
      ],
    },
    {
      label: 'Análise',
      items: [
        { path: '/screener',    label: 'Screener',    icon: 'bi-funnel-fill'         },
        { path: '/analytics',   label: 'Analytics',   icon: 'bi-bar-chart-line-fill' },
        { path: '/news',        label: 'Notícias',    icon: 'bi-newspaper'           },
        { path: '/settings',    label: 'Definições',  icon: 'bi-gear-fill'           },
      ],
    },
  ];

  toggle(): void {
    this.collapsedChange.emit(!this.collapsed);
  }
}
