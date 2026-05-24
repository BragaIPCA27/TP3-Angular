import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from '../api/auth-api.service';
import { NotificationService } from '../services/notification.service';
import { User, LoginPayload, RegisterPayload } from '../models/user.model';
import { PortfolioStore } from './portfolio.store';

const TOKEN_KEY = 'ptv2-token';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly authApi       = inject(AuthApiService);
  private readonly notifications = inject(NotificationService);
  private readonly router        = inject(Router);
  private readonly portfolio     = inject(PortfolioStore);

  private readonly _user        = signal<User | null>(null);
  private readonly _token       = signal<string | null>(null);
  private readonly _loading     = signal(false);
  private readonly _initialized = signal(false);

  readonly user          = this._user.asReadonly();
  readonly token         = this._token.asReadonly();
  readonly loading       = this._loading.asReadonly();
  readonly initialized   = this._initialized.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token() && !!this._user());

  readonly userInitials = computed(() => {
    const u = this._user();
    if (!u) return '?';
    return u.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  });

  async init(): Promise<void> {
    // Remove any legacy local portfolio state — data is now MongoDB-only
    const stale = Object.keys(localStorage).filter(k => k.startsWith('ptv2-state'));
    stale.forEach(k => localStorage.removeItem(k));

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { this._initialized.set(true); return; }
    this._token.set(token);
    try {
      const user = await firstValueFrom(this.authApi.me());
      this._user.set(user);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      this._token.set(null);
    }
    this._initialized.set(true);
  }

  async login(payload: LoginPayload): Promise<boolean> {
    this._loading.set(true);
    try {
      const { token, user } = await firstValueFrom(this.authApi.login(payload));
      this.setSession(token, user);
      await this.portfolio.reload();
      this.notifications.success('Bem-vindo!', `Olá, ${user.name}.`);
      return true;
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Erro ao autenticar. Tente novamente.';
      this.notifications.error('Erro de login', msg);
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  async register(payload: RegisterPayload): Promise<boolean> {
    this._loading.set(true);
    try {
      const { token, user } = await firstValueFrom(this.authApi.register(payload));
      this.setSession(token, user);
      await this.portfolio.reload();
      this.notifications.success('Conta criada!', `Bem-vindo, ${user.name}!`);
      return true;
    } catch (err: any) {
      const msg = err?.error?.message ?? 'Erro ao criar conta. Tente novamente.';
      this.notifications.error('Erro de registo', msg);
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  logout(): void {
    this.portfolio.reset();
    localStorage.removeItem(TOKEN_KEY);
    this._token.set(null);
    this._user.set(null);
    void this.router.navigate(['/login']);
  }

  private setSession(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    this._token.set(token);
    this._user.set(user);
  }
}
