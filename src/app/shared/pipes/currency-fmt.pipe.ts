import { Pipe, PipeTransform } from '@angular/core';
import { fmtCurrency } from '../utils/format.utils';

@Pipe({ name: 'currencyFmt', standalone: true, pure: true })
export class CurrencyFmtPipe implements PipeTransform {
  transform(value: number | null | undefined, decimals = 2, compact = false): string {
    return fmtCurrency(value ?? 0, decimals, compact);
  }
}
