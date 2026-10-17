import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Reservation } from '../core/models';
import { errorMessage } from '../core/api.service';
import { FeedbackComponent } from '../shared/feedback.component';
import { MoneyPipe } from '../shared/money.pipe';
import { ReservationApiService } from './reservation-api.service';

@Component({
  selector: 'app-host-requests',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, FeedbackComponent, MoneyPipe],
  template: `<main id="main" class="container page">
    <span class="eyebrow">Stay in control</span>
    <h1>Reservations</h1>
    <p class="muted">All requests for your properties, including declined and cancelled stays.</p>
    <app-feedback [loading]="loading" [error]="error" (retry)="load()" />
    <label class="inline-flex items-center gap-3 mt-6" for="request-status"
      >Reservation status
      <select id="request-status" [(ngModel)]="status">
        <option value="">All statuses</option>
        <option>PENDING</option>
        <option>CONFIRMED</option>
        <option>DECLINED</option>
        <option>CANCELLED</option>
      </select>
    </label>
    @if (!loading && !error && filtered().length === 0) {
      <section class="panel mt-6">
        <h2>No requests to show</h2>
        <p class="muted">New guest requests will appear here.</p>
      </section>
    }
    <div class="stack mt-6">
      @for (r of filtered(); track r.id) {
        <article class="panel request-row">
          <img [src]="r.image" [alt]="r.propertyTitle" />
          <div>
            <span class="status" [class.pending]="r.status === 'PENDING'">{{ r.status }}</span>
            <h2 class="mt-3">{{ r.propertyTitle }}</h2>
            <p>{{ r.guest.name }} · {{ r.guests }} guests</p>
            <p class="muted">
              {{ r.checkIn | date: 'mediumDate' }} – {{ r.checkOut | date: 'mediumDate' }}
            </p>
          </div>
          <div>
            <strong>{{ r.total | money }}</strong>
            <p class="muted text-sm">{{ r.paymentStatus }}</p>
            <a class="btn secondary mt-4" [routerLink]="['/host/reservations', r.id]"
              >View request</a
            >
          </div>
        </article>
      }
    </div>
  </main>`,
  styles: [
    '.request-row{display:grid;grid-template-columns:140px 1fr auto;gap:24px;align-items:center}.request-row img{width:140px;height:120px;border-radius:12px;object-fit:cover}@media(max-width:640px){.request-row{grid-template-columns:1fr}.request-row img{width:100%;height:200px}}',
  ],
})
export class HostRequestsComponent implements OnInit {
  private readonly api = inject(ReservationApiService);
  reservations: Reservation[] = [];
  status = '';
  loading = true;
  error = '';
  ngOnInit() {
    void this.load();
  }
  filtered() {
    return this.reservations.filter((r) => !this.status || r.status === this.status);
  }
  async load() {
    this.loading = true;
    this.error = '';
    try {
      this.reservations = await this.api.hostRequests();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }
}
