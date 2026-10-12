import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IdentityService } from './identity.service';
import { errorMessage } from '../core/api.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main id="main" class="page auth-page">
      <section class="panel auth-panel">
        <span class="eyebrow">Welcome to Stayora</span>
        <h1>{{ creating ? 'Create your account' : 'A place to come back to' }}</h1>
        <p class="muted">
          {{
            creating
              ? 'Find a stay or welcome guests with your own listing.'
              : 'Sign in to manage your stays, saved properties, and conversations.'
          }}
        </p>
        @if (!identity.available()) {
          <p role="alert" class="feedback error">
            The account service is unavailable. Check your connection and retry.
          </p>
        }
        @if (error) {
          <p class="feedback error" role="alert">{{ error }}</p>
        }
        <form (ngSubmit)="submit()" #form="ngForm">
          @if (creating) {
            <label for="auth-name">Your name</label
            ><input
              id="auth-name"
              name="name"
              [(ngModel)]="name"
              maxlength="120"
              autocomplete="name"
              required
            />
          }
          <label for="auth-email">Email</label
          ><input
            id="auth-email"
            name="email"
            [(ngModel)]="email"
            type="email"
            maxlength="180"
            autocomplete="email"
            required
            email
          />
          <label for="auth-password"
            >Password{{ creating ? ' (at least 10 characters)' : '' }}</label
          >
          <input
            id="auth-password"
            name="password"
            [(ngModel)]="password"
            type="password"
            [minlength]="creating ? 10 : 1"
            maxlength="128"
            [autocomplete]="creating ? 'new-password' : 'current-password'"
            required
          />
          @if (creating) {
            <label for="auth-role">How will you use Stayora?</label>
            <select id="auth-role" name="role" [(ngModel)]="role">
              <option value="GUEST">Find and book stays</option>
              <option value="HOST">List a property and welcome guests</option>
            </select>
          }
          <button class="btn" [disabled]="busy || form.invalid">
            {{ busy ? 'Please wait…' : creating ? 'Create account' : 'Sign in' }}
          </button>
        </form>
        <p class="text-sm">
          {{ creating ? 'Already have an account?' : 'New to Stayora?' }}
          <a [routerLink]="creating ? '/login' : '/register'">{{
            creating ? 'Sign in' : 'Create account'
          }}</a>
        </p>
        @if (identity.demoEnabled()) {
          <p class="text-xs muted">
            You can also <a routerLink="/explore">explore the demo</a> without registering. Demo
            identities are separate from your account.
          </p>
        }
      </section>
    </main>
  `,
  styles: [
    `
      .auth-page {
        display: flex;
        justify-content: center;
        padding-top: 48px;
        padding-bottom: 72px;
      }
      .auth-panel {
        width: min(100%, 540px);
        padding: 36px;
      }
      .auth-panel h1 {
        font-size: 36px;
        margin: 12px 0;
      }
      .auth-panel form {
        display: grid;
        gap: 12px;
        margin: 24px 0;
      }
      .auth-panel input,
      .auth-panel select {
        width: 100%;
      }
      .auth-panel .btn {
        margin-top: 8px;
      }
      @media (max-width: 540px) {
        .auth-panel {
          padding: 24px;
        }
        .auth-panel h1 {
          font-size: 30px;
        }
      }
    `,
  ],
})
export class AuthComponent {
  readonly identity = inject(IdentityService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly creating = this.route.snapshot.data['register'] === true;
  name = '';
  email = '';
  password = '';
  role: 'GUEST' | 'HOST' = 'GUEST';
  busy = false;
  error = '';

  async submit() {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    try {
      if (this.creating)
        await this.identity.register(this.name, this.email, this.password, this.role);
      else await this.identity.signIn(this.email, this.password);
      this.password = '';
      const requested = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
      const safe =
        requested.startsWith('/') && !requested.startsWith('//') && !requested.includes('\\');
      const target =
        safe && (!requested.startsWith('/host') || this.identity.account()?.role === 'HOST')
          ? requested
          : this.identity.account()?.role === 'HOST'
            ? '/host/today'
            : '/trips';
      await this.router.navigateByUrl(target);
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.busy = false;
    }
  }
}
