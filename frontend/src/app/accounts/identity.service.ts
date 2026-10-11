import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Account } from '../core/models';

interface Session {
  account: Account | null;
  csrfToken: string;
  demoEnabled: boolean;
}
@Injectable({ providedIn: 'root' })
export class IdentityService {
  private readonly http = inject(HttpClient);
  readonly mode = signal<'guest' | 'host'>('guest');
  readonly account = signal<Account | null>(null);
  readonly demoEnabled = signal(true);
  readonly available = signal(true);
  readonly revision = signal(0);
  readonly csrf = signal('');

  async initialize(): Promise<void> {
    try {
      this.apply(await firstValueFrom(this.http.get<Session>('/api/auth/session')));
    } catch {
      this.demoEnabled.set(false);
      this.available.set(false);
    }
  }

  private apply(session: Session) {
    this.account.set(session.account);
    this.csrf.set(session.csrfToken);
    this.demoEnabled.set(session.demoEnabled);
    this.available.set(true);
    this.revision.update((value) => value + 1);
  }

  select(mode: 'guest' | 'host'): boolean {
    if (this.mode() !== mode) {
      this.mode.set(mode);
      if (!this.account()) this.revision.update((value) => value + 1);
    }
    return true;
  }

  async signIn(email: string, password: string) {
    this.apply(
      await firstValueFrom(this.http.post<Session>('/api/auth/login', { email, password })),
    );
  }

  async register(name: string, email: string, password: string, role: 'GUEST' | 'HOST') {
    this.apply(
      await firstValueFrom(
        this.http.post<Session>('/api/auth/register', { name, email, password, role }),
      ),
    );
  }

  async signOut() {
    await firstValueFrom(this.http.post<void>('/api/auth/logout', {}));
    this.account.set(null);
    this.csrf.set('');
    this.revision.update((value) => value + 1);
  }
}
