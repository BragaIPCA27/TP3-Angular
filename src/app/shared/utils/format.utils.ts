export function fmtCurrency(value: number, decimals = 2, compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (compact && Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function fmtPercent(value: number, sign = true, decimals = 2): string {
  const prefix = sign && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(decimals)}%`;
}

export function fmtNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function changeClass(value: number): string {
  if (value > 0) return 'text-emerald-500 dark:text-emerald-400';
  if (value < 0) return 'text-red-500 dark:text-red-400';
  return 'text-slate-400';
}

export function changeBgClass(value: number): string {
  if (value > 0) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (value < 0) return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
}
