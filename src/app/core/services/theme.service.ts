import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _dark = signal(false);
  readonly isDark = this._dark.asReadonly();

  constructor() {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    const isDark = stored !== null ? stored === 'dark' : prefersDark;
    this.apply(isDark);
  }

  toggle(): void {
    this.apply(!this._dark());
  }

  private apply(dark: boolean): void {
    this._dark.set(dark);
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }
}
