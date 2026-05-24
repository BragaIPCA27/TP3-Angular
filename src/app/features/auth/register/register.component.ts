import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/store/auth.store';
import { Router } from '@angular/router';

function passwordMatch(ctrl: AbstractControl): ValidationErrors | null {
  const pw  = ctrl.get('password')?.value;
  const cpw = ctrl.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthStore);
  private readonly router = inject(Router);

  readonly loading  = this.auth.loading;
  readonly showPass = signal(false);
  readonly showConf = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      name:            ['', [Validators.required, Validators.minLength(2)]],
      username:        ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-z0-9_]+$/)]],
      email:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatch },
  );

  get name()            { return this.form.controls.name; }
  get username()        { return this.form.controls.username; }
  get email()           { return this.form.controls.email; }
  get password()        { return this.form.controls.password; }
  get confirmPassword() { return this.form.controls.confirmPassword; }

  readonly passwordStrength = computed(() => {
    const pw = this.form.controls.password.value;
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  });

  readonly strengthLabel = computed(() => {
    const s = this.passwordStrength();
    if (s <= 1) return { text: 'Fraca',  color: 'bg-red-500'    };
    if (s <= 2) return { text: 'Média',  color: 'bg-amber-400'  };
    if (s <= 3) return { text: 'Boa',    color: 'bg-yellow-400' };
    if (s <= 4) return { text: 'Forte',  color: 'bg-emerald-400'};
    return              { text: 'Máxima', color: 'bg-emerald-500'};
  });

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { confirmPassword, ...payload } = this.form.getRawValue();
    const ok = await this.auth.register(payload);
    if (ok) void this.router.navigate(['/dashboard']);
  }
}
