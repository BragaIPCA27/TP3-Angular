import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectorPerf } from '../../../../core/models/market.model';

@Component({
  selector: 'app-sector-perf',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sector-perf.component.html',
})
export class SectorPerfComponent {
  @Input() sectors: SectorPerf[] = [];
  @Input() loading = false;

  maxAbs(): number {
    if (!this.sectors.length) return 1;
    return Math.max(1, ...this.sectors.map(s => Math.abs(s.changePercent)));
  }

  barWidth(pct: number): number {
    return Math.round((Math.abs(pct) / this.maxAbs()) * 100);
  }
}
