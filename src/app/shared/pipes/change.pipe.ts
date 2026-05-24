import { Pipe, PipeTransform } from '@angular/core';
import { fmtPercent, changeClass, changeBgClass } from '../utils/format.utils';

@Pipe({ name: 'changeText', standalone: true, pure: true })
export class ChangeTextPipe implements PipeTransform {
  transform(value: number | null | undefined, sign = true): string {
    return fmtPercent(value ?? 0, sign);
  }
}

@Pipe({ name: 'changeClass', standalone: true, pure: true })
export class ChangeClassPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return changeClass(value ?? 0);
  }
}

@Pipe({ name: 'changeBg', standalone: true, pure: true })
export class ChangeBgPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return changeBgClass(value ?? 0);
  }
}
