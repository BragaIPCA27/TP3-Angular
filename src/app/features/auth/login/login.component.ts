import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/store/auth.store';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthStore);
  private readonly router = inject(Router);

  readonly loading  = this.auth.loading;
  readonly showPass = signal(false);

  readonly features = [
    { icon: 'bi-lightning-charge-fill', text: 'Ordens avançadas: limite, stop, trailing stop' },
    { icon: 'bi-bar-chart-line-fill',   text: 'Analytics e risco em tempo real' },
    { icon: 'bi-funnel-fill',           text: 'Screener com sinais técnicos automáticos' },
    { icon: 'bi-shield-fill-check',      text: 'Portfolio seguro com MongoDB Atlas' },
  ];

  readonly form = this.fb.nonNullable.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  get email()    { return this.form.controls.email; }
  get password() { return this.form.controls.password; }

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const ok = await this.auth.login(this.form.getRawValue());
    if (ok) void this.router.navigate(['/dashboard']);
  }
}
