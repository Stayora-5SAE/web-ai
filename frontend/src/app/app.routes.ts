import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { IdentityService } from './accounts/identity.service';
import { GuestLayoutComponent, HostLayoutComponent } from './shared/layout.component';
const guestAccount = () => {
  const identity = inject(IdentityService);
  return (
    identity.account()?.role === 'GUEST' ||
    (!identity.account() && identity.demoEnabled()) ||
    inject(Router).createUrlTree(['/login'], { queryParams: { reason: 'guest' } })
  );
};
const hostAccount = () => {
  const identity = inject(IdentityService);
  identity.select('host');
  return (
    identity.account()?.role === 'HOST' ||
    (!identity.account() && identity.demoEnabled()) ||
    inject(Router).createUrlTree(['/login'], { queryParams: { reason: 'host' } })
  );
};
export const routes: Routes = [
  {
    path: '',
    component: GuestLayoutComponent,
    canActivate: [() => inject(IdentityService).select('guest')],
    children: [
      { path: '', redirectTo: 'explore', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./accounts/auth.component').then((m) => m.AuthComponent),
      },
      {
        path: 'register',
        data: { register: true },
        loadComponent: () => import('./accounts/auth.component').then((m) => m.AuthComponent),
      },
      {
        path: 'wishlists',
        canActivate: [guestAccount],
        loadComponent: () =>
          import('./listings/wishlists.component').then((m) => m.WishlistsComponent),
      },
      {
        path: 'trips',
        canActivate: [guestAccount],
        loadComponent: () => import('./reservations/trips.component').then((m) => m.TripsComponent),
      },
      {
        path: 'trips/:id',
        canActivate: [guestAccount],
        loadComponent: () =>
          import('./reservations/trip-detail.component').then((m) => m.TripDetailComponent),
      },
      {
        path: 'reviews',
        canActivate: [guestAccount],
        loadComponent: () => import('./reviews/reviews.component').then((m) => m.ReviewsComponent),
      },
      {
        path: 'properties/:propertyId/reviews',
        loadComponent: () =>
          import('./reviews/property-reviews.component').then((m) => m.PropertyReviewsComponent),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./messages/messages.component').then((m) => m.MessagesComponent),
      },
      {
        path: 'messages/threads/:threadId',
        loadComponent: () =>
          import('./messages/messages.component').then((m) => m.MessagesComponent),
      },
      {
        path: 'messages/:reservationId',
        loadComponent: () =>
          import('./messages/messages.component').then((m) => m.MessagesComponent),
      },
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
        canActivate: [guestAccount],
        loadComponent: () =>
          import('./reservations/review.component').then((m) => m.ReviewComponent),
      },
    ],
  },
  {
    path: 'host',
    component: HostLayoutComponent,
    canActivate: [hostAccount],
    children: [
      { path: '', redirectTo: 'today', pathMatch: 'full' },
      {
        path: 'reviews',
        data: { host: true },
        loadComponent: () => import('./reviews/reviews.component').then((m) => m.ReviewsComponent),
      },
      {
        path: 'listings/new',
        loadComponent: () =>
          import('./listings/listing-editor.component').then((m) => m.ListingEditorComponent),
      },
      {
        path: 'listings/:id/edit',
        loadComponent: () =>
          import('./listings/listing-editor.component').then((m) => m.ListingEditorComponent),
      },
      {
        path: 'reservations',
        loadComponent: () =>
          import('./reservations/host-requests.component').then((m) => m.HostRequestsComponent),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./messages/messages.component').then((m) => m.MessagesComponent),
      },
      {
        path: 'messages/threads/:threadId',
        loadComponent: () =>
          import('./messages/messages.component').then((m) => m.MessagesComponent),
      },
      {
        path: 'messages/:reservationId',
        loadComponent: () =>
          import('./messages/messages.component').then((m) => m.MessagesComponent),
      },
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
