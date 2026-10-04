import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { IdentityService } from './accounts/identity.service';
import { GuestLayoutComponent, HostLayoutComponent } from './shared/layout.component';
export const routes: Routes = [
  {
    path: '',
    component: GuestLayoutComponent,
    canActivate: [() => inject(IdentityService).select('guest')],
    children: [
      { path: '', redirectTo: 'explore', pathMatch: 'full' },
      {
        path: 'explore',
        loadComponent: () => import('./listings/explore.component').then((m) => m.ExploreComponent),
      },
      {
        path: 'search',
        loadComponent: () => import('./listings/search.component').then((m) => m.SearchComponent),
      },
      {
        path: 'properties/:id',
        loadComponent: () =>
          import('./listings/property-detail.component').then((m) => m.PropertyDetailComponent),
      },
      {
        path: 'reservations/review',
        loadComponent: () =>
          import('./reservations/review.component').then((m) => m.ReviewComponent),
      },
    ],
  },
  {
    path: 'host',
    component: HostLayoutComponent,
    canActivate: [() => inject(IdentityService).select('host')],
    children: [
      { path: '', redirectTo: 'today', pathMatch: 'full' },
      {
        path: 'today',
        loadComponent: () => import('./availability/today.component').then((m) => m.TodayComponent),
      },
      {
        path: 'listings',
        loadComponent: () =>
          import('./listings/host-listings.component').then((m) => m.HostListingsComponent),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./availability/calendar.component').then((m) => m.CalendarComponent),
      },
      {
        path: 'reservations/:id',
        loadComponent: () =>
          import('./reservations/host-reservation.component').then(
            (m) => m.HostReservationComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'explore' },
];
