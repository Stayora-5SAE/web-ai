import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class IdentityService {
  readonly mode = signal<'guest' | 'host'>('guest');
  select(mode: 'guest' | 'host'): boolean {
    this.mode.set(mode);
    return true;
  }
}
