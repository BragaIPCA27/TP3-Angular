import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../core/services/theme.service';
import { PortfolioStore } from '../../core/store/portfolio.store';
import { CurrencyFmtPipe } from '../../shared/pipes/currency-fmt.pipe';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, CurrencyFmtPipe],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  readonly theme = inject(ThemeService);
  readonly store = inject(PortfolioStore);
}
