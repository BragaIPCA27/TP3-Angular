import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { ToastComponent } from '../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, ToastComponent],
  template: `
    <div class="flex min-h-screen bg-slate-50 dark:bg-slate-950">

      <app-sidebar
        [collapsed]="sidebarCollapsed()"
        (collapsedChange)="sidebarCollapsed.set($event)">
      </app-sidebar>

      <div
        class="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden transition-all duration-300 ease-smooth"
        [class.ml-64]="!sidebarCollapsed()"
        [class.ml-16]="sidebarCollapsed()">

        <app-topbar
          [sidebarCollapsed]="sidebarCollapsed()"
          (toggleSidebar)="toggleSidebar()">
        </app-topbar>

        <main class="flex-1 p-6 max-w-screen-2xl w-full mx-auto">
          <router-outlet></router-outlet>
        </main>

      </div>

      <app-toast></app-toast>
    </div>
  `,
})
export class MainLayoutComponent {
  readonly sidebarCollapsed = signal(false);

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }
}
