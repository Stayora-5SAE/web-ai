import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Reservation } from '../core/models';
import { errorMessage } from '../core/api.service';
import { FeedbackComponent } from '../shared/feedback.component';
import { MoneyPipe } from '../shared/money.pipe';
import { ReservationApiService } from './reservation-api.service';

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [DatePipe, RouterLink, FeedbackComponent, MoneyPipe],
  template: `<main id="main" class="container page">
    <span class="eyebrow">Your next chapter</span>
    <h1>Your trips</h1>
    <p class="muted">Follow your requests, view receipts, and manage upcoming stays.</p>
    <app-feedback [loading]="loading" [error]="error" (retry)="load()" />
    @if (!loading && !error && trips.length === 0) {
      <section class="panel mt-6">
        <h2>Your first stay is waiting</h2>
        <p class="muted">You have no reservations yet.</p>
        <a class="btn mt-4" routerLink="/explore">Find a stay</a>
      </section>
    }
    <div class="trip-grid mt-6">
      @for (trip of trips; track trip.id) {
        <article class="panel">
          <img class="trip-photo" [src]="trip.image" [alt]="trip.propertyTitle" />
          <span class="status mt-4" [class.pending]="trip.status === 'PENDING'">{{
            trip.status
          }}</span>
          <h2 class="mt-4">{{ trip.propertyTitle }}</h2>
          <p>{{ trip.checkIn | date: 'mediumDate' }} – {{ trip.checkOut | date: 'mediumDate' }}</p>
          <p class="muted mt-2">{{ trip.guests }} guests · {{ trip.total | money }}</p>
          @if (trip.status === 'CONFIRMED' && trip.checkOut <= today) {
            <a class="btn mt-4" routerLink="/reviews" [queryParams]="{ reservationId: trip.id }"
              >Review your stay</a
            >
          }
          <a class="btn secondary mt-4" [routerLink]="['/trips', trip.id]">Manage trip</a>
        </article>
      }
    </div>
  </main>`,
  styles: [
    '.trip-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:24px}.trip-photo{width:100%;height:200px;object-fit:cover;border-radius:12px}',
  ],
})
export class TripsComponent implements OnInit {
  private readonly api = inject(ReservationApiService);
  readonly today = new Date().toLocaleDateString('en-CA');
  trips: Reservation[] = [];
  loading = true;
  error = '';
  ngOnInit() {
    void this.load();
  }
  async load() {
    this.loading = true;
    this.error = '';
    try {
      this.trips = await this.api.trips();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }
}
