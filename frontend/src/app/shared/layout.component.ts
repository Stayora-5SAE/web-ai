import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent } from './icon.component';
import { IdentityService } from '../accounts/identity.service';
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: ` <header class="site-header">
    <div class="header-inner">
      <a class="brand" routerLink="/explore">Stayora</a>
      @if (host) {
        <span class="host-pill">Host Mode</span>
      }
      <nav aria-label="Main navigation">
        @if (host) {
          <a routerLink="/host/today" routerLinkActive="active">Today</a
          ><a routerLink="/host/listings" routerLinkActive="active">Listings</a
          ><a routerLink="/host/calendar" routerLinkActive="active">Calendar</a>
          <a routerLink="/host/reservations" routerLinkActive="active">Requests</a>
        } @else {
          <a routerLink="/explore" routerLinkActive="active">Explore</a>
          @if (!identity.account() || identity.account()?.role === 'GUEST') {
            <a routerLink="/wishlists" routerLinkActive="active">Wishlists</a>
            <a routerLink="/trips" routerLinkActive="active">Trips</a>
            <a routerLink="/reviews" routerLinkActive="active">Reviews</a>
          }
        }
        <a [routerLink]="host ? '/host/messages' : '/messages'" routerLinkActive="active"
          >Messages</a
        >
      </nav>
      @if (
        host ||
        identity.account()?.role === 'HOST' ||
        (!identity.account() && identity.demoEnabled())
      ) {
        <a class="mode-switch" [routerLink]="host ? '/explore' : '/host/today'">{{
          host ? 'Explore stays' : 'Switch to hosting'
        }}</a>
      }
      @if (identity.account(); as account) {
        <div class="header-account">
          <span class="text-xs">{{ account.name }}</span
          ><button class="text-link" (click)="signOut()">Sign out</button>
        </div>
      } @else {
        <a class="avatar-pill" routerLink="/login" aria-label="Sign in or create an account"
          ><app-icon name="menu" /><span class="avatar">{{ host ? 'N' : 'SB' }}</span></a
        >
      }
      @if (error) {
        <p role="alert" class="error-text">{{ error }}</p>
      }
    </div>
  </header>`,
})
export class HeaderComponent {
  @Input() host = false;
  readonly identity = inject(IdentityService);
  private readonly router = inject(Router);
  error = '';
  async signOut() {
    try {
      await this.identity.signOut();
      await this.router.navigateByUrl('/explore');
    } catch {
      this.error = 'Sign out failed. Check your connection and try again.';
    }
  }
}
@Component({
  selector: 'app-footer',
  standalone: true,
  template: `<footer class="site-footer">
    <div class="footer-inner">
      <div>
        <a class="brand" href="/explore">Stayora</a>
        <p class="text-xs muted">© 2026 Stayora · Hospitality with soul</p>
      </div>
      <div class="footer-links">
        <span>Warm editorial travel discoveries and sanctuaries.</span
        ><span class="badge">{{ identity.demoEnabled() ? 'Development demo' : 'Stayora' }}</span>
      </div>
    </div>
  </footer>`,
})
export class FooterComponent {
  readonly identity = inject(IdentityService);
}
@Component({
  selector: 'app-guest-layout',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterOutlet],
  template: '<app-header/><router-outlet/><app-footer/>',
})
export class GuestLayoutComponent {}
@Component({
  selector: 'app-host-layout',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterOutlet],
  template:
    '<div class="host-surface"><app-header [host]="true"/><router-outlet/><app-footer/></div>',
})
export class HostLayoutComponent {}
