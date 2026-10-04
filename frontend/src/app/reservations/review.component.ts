import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { Account, Property, Quote, Reservation } from '../core/models';
import { SelectionService } from '../core/selection.service';
import { FeedbackComponent } from '../shared/feedback.component';
import { IconComponent } from '../shared/icon.component';
import { MoneyPipe } from '../shared/money.pipe';
@Component({
  selector: 'app-review',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, FeedbackComponent, IconComponent, MoneyPipe],
  template: ` <main id="main" class="container checkout page">
    <a
      [routerLink]="['/properties', propertyId]"
      [queryParams]="selection.params()"
      class="inline-flex items-center gap-2"
      ><app-icon name="back" /> Back to property</a
    >
    <h1>Review & confirm your reservation</h1>
    <p class="muted">Please review your stay itinerary and guest details prior to booking.</p>
    <app-feedback [loading]="loading" [error]="error" (retry)="load()" />
    @if (booked; as r) {
      <section class="success" aria-live="polite">
        <span class="status">Request sent</span>
        <h2 class="mt-4">Your stay is one step closer.</h2>
        <p class="mt-3">
          Reservation {{ r.reference }} is pending host approval. The simulated payment made no real
          charge.
        </p>
        <p class="mt-2">
          {{ r.checkIn | date: 'mediumDate' }} – {{ r.checkOut | date: 'mediumDate' }} ·
          {{ r.guests }} guests · {{ r.total | money }}
        </p>
        <div class="dashboard-actions">
          <a class="btn" [routerLink]="['/host/reservations', r.id]"
            >View in demo host mode <app-icon name="arrow" /></a
          ><a class="btn secondary" routerLink="/explore">Explore more stays</a>
        </div>
      </section>
    }
    @if (!loading && !error && property && quote && !booked) {
      <div class="two-columns">
        <form class="stack" (ngSubmit)="confirm()">
          <section class="panel">
            <h2>Your trip details</h2>
            <div class="flex justify-between items-center">
              <div>
                <strong>Dates</strong>
                <p class="muted">
                  {{ quote.checkIn | date: 'mediumDate' }} –
                  {{ quote.checkOut | date: 'mediumDate' }} ({{ quote.nights }} nights)
                </p>
              </div>
              <a [routerLink]="['/properties', propertyId]" [queryParams]="selection.params()"
                >Edit</a
              >
            </div>
            <div class="divider"></div>
            <div class="flex justify-between">
              <div>
                <strong>Guests</strong>
                <p class="muted">{{ quote.guests }} adults</p>
              </div>
              <a [routerLink]="['/properties', propertyId]" [queryParams]="selection.params()"
                >Edit</a
              >
            </div>
            <div class="divider"></div>
            <p class="flex items-center gap-3 muted text-sm">
              <app-icon name="key" />Check-in starts at 3:00 PM · Demo self check-in
            </p>
          </section>
          <section class="panel">
            <div class="flex justify-between">
              <h2>Guest information</h2>
              <span class="status">Demo guest</span>
            </div>
            <div class="inset guest-information">
              <div>
                <small>Primary guest</small><strong>{{ account?.name }}</strong>
              </div>
              <div>
                <small>Email address</small><span>{{ account?.email }}</span>
              </div>
            </div>
          </section>
          <section class="panel">
            <div class="flex justify-between">
              <h2>Payment method</h2>
              <span class="status pending">Prototype</span>
            </div>
            <div class="note">
              <app-icon name="check" />Demo payment · No card information required
            </div>
            <p class="text-xs muted mt-4">
              This is a simulated payment. No real charges will be made, and no card data is
              collected.
            </p>
          </section>
          <section class="panel">
            <h2>Ground rules & cancellation policy</h2>
            <div class="inset">
              Respect the property and your neighbors. Your request remains pending until the host
              accepts. Payments and refunds are simulated.
            </div>
            <label class="agreement"
              ><input type="checkbox" name="agreed" [(ngModel)]="agreed" required /><span
                >I agree to the house rules and understand this is a development demo.</span
              ></label
            >
          </section>
          <div class="confirm-action">
            @if (bookingError) {
              <p role="alert" class="error-text">{{ bookingError }}</p>
            }
            <button class="btn full" [disabled]="busy || !agreed">
              {{ busy ? 'Submitting…' : 'Confirm demo payment — ' + (quote.total | money)
              }}<app-icon name="arrow" />
            </button>
            <p class="muted">Your request will be sent to the host for approval.</p>
          </div>
        </form>
        <aside class="panel checkout-summary">
          <div class="summary-property">
            <img [src]="property.images[0]" [alt]="property.title" />
            <div>
              <span class="badge">{{ property.badge }}</span>
              <h3 class="mt-2">{{ property.title }}</h3>
              <p class="text-xs mt-2">
                {{ property.destination }} · {{ property.capacity }} guests
              </p>
              <p class="text-xs mt-1">
                ☆ {{ property.rating }} ({{ property.reviewCount }} reviews)
              </p>
            </div>
          </div>
          <div class="note mt-6">
            <app-icon name="shield" />Transparent pricing, every step of your stay.
          </div>
          <div class="divider"></div>
          <h2>Price details</h2>
          <div class="price-row">
            <span>{{ quote.nightlyPrice | money }} × {{ quote.nights }} nights</span
            ><span>{{ quote.subtotal | money }}</span>
          </div>
          <div class="price-row">
            <span>Cleaning fee</span><span>{{ quote.cleaningFee | money }}</span>
          </div>
          <div class="price-row">
            <span>Stayora service fee</span><span>{{ quote.serviceFee | money }}</span>
          </div>
          <div class="price-row total">
            <span>Total (TND)</span><span>{{ quote.total | money }}</span>
          </div>
          <p class="text-xs muted">Includes all applicable booking fees</p>
        </aside>
      </div>
    }
  </main>`,
})
export class ReviewComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly selection = inject(SelectionService);
  propertyId = '';
  property: Property | null = null;
  quote: Quote | null = null;
  account: Account | null = null;
  booked: Reservation | null = null;
  agreed = false;
  loading = true;
  busy = false;
  error = '';
  bookingError = '';
  ngOnInit() {
    this.selection.restore(this.route.snapshot.queryParamMap);
    this.propertyId = this.route.snapshot.queryParamMap.get('propertyId') ?? '';
    void this.load();
  }
  async load() {
    this.loading = true;
    this.error = '';
    try {
      if (!this.propertyId) {
        this.error = 'Choose a property before reviewing a reservation.';
        return;
      }
      [this.property, this.quote, this.account] = await Promise.all([
        this.api.property(this.propertyId),
        this.api.quote(this.selection.booking(this.propertyId)),
        this.api.me(),
      ]);
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.loading = false;
    }
  }
  async confirm() {
    if (!this.agreed || this.busy || !this.quote) return;
    this.busy = true;
    this.bookingError = '';
    try {
      this.booked = await this.api.book({
        propertyId: this.quote.propertyId,
        checkIn: this.quote.checkIn,
        checkOut: this.quote.checkOut,
        guests: this.quote.guests,
      });
    } catch (e) {
      this.bookingError = errorMessage(e);
    } finally {
      this.busy = false;
    }
  }
}
