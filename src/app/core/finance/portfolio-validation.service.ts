import { Injectable, inject } from '@angular/core';
import { PortfolioStore } from '../store/portfolio.store';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const EPSILON = 0.01; // $0.01 tolerance for floating-point drift

@Injectable({ providedIn: 'root' })
export class PortfolioValidationService {
  private readonly store = inject(PortfolioStore);

  /** Run all invariant checks and return a structured result. */
  validate(): ValidationResult {
    const errors:   string[] = [];
    const warnings: string[] = [];

    const views   = this.store.positionsView();
    const summary = this.store.summary();

    // ── 1. Portfolio value = sum of position market values ─────────
    const sumMV = views.reduce((s, p) => s + p.marketValue, 0);
    if (Math.abs(sumMV - summary.portfolioValue) > EPSILON) {
      errors.push(
        `Portfolio value mismatch: store.summary.portfolioValue=${summary.portfolioValue.toFixed(2)} ` +
        `but sum of position market values=${sumMV.toFixed(2)} (delta=${(sumMV - summary.portfolioValue).toFixed(4)})`
      );
    }

    // ── 2. Total invested = sum of position invested values ────────
    const sumInv = views.reduce((s, p) => s + p.investedValue, 0);
    if (Math.abs(sumInv - summary.totalInvested) > EPSILON) {
      errors.push(
        `Total invested mismatch: store.summary.totalInvested=${summary.totalInvested.toFixed(2)} ` +
        `but sum of position investedValues=${sumInv.toFixed(2)} (delta=${(sumInv - summary.totalInvested).toFixed(4)})`
      );
    }

    // ── 3. Allocation weights sum to ~100% (or 0% if no positions) ─
    if (views.length > 0) {
      const sumWeights = views.reduce((s, p) => s + p.weight, 0);
      if (Math.abs(sumWeights - 100) > 0.1) {
        errors.push(
          `Allocation weights do not sum to 100%: actual sum=${sumWeights.toFixed(4)}%`
        );
      }
    }

    // ── 4. Account value = balance + portfolioValue ────────────────
    const expectedAccount = this.store.balance() + summary.portfolioValue;
    if (Math.abs(expectedAccount - summary.accountValue) > EPSILON) {
      errors.push(
        `Account value mismatch: balance(${this.store.balance().toFixed(2)}) + ` +
        `portfolioValue(${summary.portfolioValue.toFixed(2)}) = ${expectedAccount.toFixed(2)} ` +
        `but summary.accountValue=${summary.accountValue.toFixed(2)}`
      );
    }

    // ── 5. No position with zero or negative quantity ──────────────
    views.filter(p => p.weight < 0).forEach(p => {
      errors.push(`Position ${p.ticker} has a negative weight (${p.weight.toFixed(4)}%)`);
    });

    // ── 6. Warn on extreme concentration ──────────────────────────
    const topWeight = views.length > 0 ? Math.max(...views.map(p => p.weight)) : 0;
    if (topWeight > 50) {
      warnings.push(
        `High concentration risk: largest position is ${topWeight.toFixed(1)}% of portfolio`
      );
    }

    // ── 7. Warn on negative balance ───────────────────────────────
    if (this.store.balance() < 0) {
      warnings.push(`Cash balance is negative: $${this.store.balance().toFixed(2)}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /** Log validation results to the console (dev utility). */
  logToConsole(): void {
    const result = this.validate();
    if (result.valid && result.warnings.length === 0) {
      console.log('%c[PortfolioValidation] ✓ All invariants pass', 'color: #10b981');
      return;
    }
    result.errors.forEach(e =>
      console.error('%c[PortfolioValidation] ✗ ' + e, 'color: #ef4444')
    );
    result.warnings.forEach(w =>
      console.warn('%c[PortfolioValidation] ⚠ ' + w, 'color: #f59e0b')
    );
  }
}
