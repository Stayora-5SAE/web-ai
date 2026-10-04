import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent } from './icon.component';
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
        } @else {
          <a routerLink="/explore" routerLinkActive="active">Explore</a
          ><button disabled title="Wishlists module coming soon">Wishlists</button
          ><button disabled title="Trips module coming soon">Trips</button>
        }
        <button disabled title="Messaging module coming soon">Messages</button>
      </nav>
      <a class="mode-switch" [routerLink]="host ? '/explore' : '/host/today'">{{
        host ? 'Switch to Guest mode' : 'Switch to hosting'
      }}</a>
      <div class="avatar-pill" aria-label="Development demo identity">
        <app-icon name="menu" /><span class="avatar">{{ host ? 'N' : 'SB' }}</span>
      </div>
    </div>
  </header>`,
})
export class HeaderComponent {
  @Input() host = false;
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
        ><span class="badge">Development demo</span>
      </div>
    </div>
  </footer>`,
})
export class FooterComponent {}
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
