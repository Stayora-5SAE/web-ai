import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService, errorMessage } from '../core/api.service';
import { Reservation } from '../core/models';
import { FeedbackComponent } from '../shared/feedback.component';
import { MoneyPipe } from '../shared/money.pipe';
import { AiMarkdownComponent } from '../shared/ai-markdown.component';
import { PaymentReceipt, ReservationApiService } from './reservation-api.service';

@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, FeedbackComponent, MoneyPipe, AiMarkdownComponent],
  template: `<main id="main" class="container page">
    <a routerLink="/trips">← Back to your trips</a>
    <app-feedback [loading]="loading" [error]="error" (retry)="load()" />
    @if (trip; as r) {
      <h1 class="mt-6">{{ r.propertyTitle }}</h1>
      <span class="status">{{ r.status }}</span>
      <p class="muted mt-3">
        {{ r.reference }} · {{ r.checkIn | date: 'mediumDate' }} –
        {{ r.checkOut | date: 'mediumDate' }}
      </p>
      <div class="two-columns">
        <div class="stack">
          <section class="panel">
            <h2>Your stay</h2>
            <img class="trip-photo" [src]="r.image" [alt]="r.propertyTitle" />
            <p class="mt-4">
              {{ r.guests }} guests · Check-in from 3:00 PM · Check-out before 11:00 AM.
            </p>
            <a class="btn secondary mt-4" [routerLink]="['/properties', r.propertyId]"
              >View property</a
            >
            <a class="btn secondary mt-4" [routerLink]="['/messages', r.id]">Contact host</a>
            @if (r.status === 'CONFIRMED' && r.checkOut <= today) {
              <a
                class="btn secondary mt-4"
                routerLink="/reviews"
                [queryParams]="{ reservationId: r.id }"
                >Review your stay</a
              >
            }
          </section>
          <section class="panel">
            <h2>AI trip planner</h2>
            <p class="muted">
              Get a suggested itinerary using your destination, dates, and party size. Advice may
              need verification.
            </p>
            <button class="btn secondary mt-4" [disabled]="aiBusy" (click)="plan()">
              {{ aiBusy ? 'Planning…' : 'Suggest an itinerary' }}
            </button>
            @if (aiText) {
              <div class="inset mt-4">
                <span class="eyebrow">{{ aiMode }} AI · advice only</span>
                @if (aiNotice) {
                  <p class="text-xs muted mt-3">{{ aiNotice }}</p>
                }
                <app-ai-markdown class="mt-3" [text]="aiText" />
              </div>
            }
            @if (aiError) {
              <p role="alert" class="error-text">{{ aiError }}</p>
            }
          </section>
        </div>
        <aside class="stack">
          <section class="panel">
            <h2>Payment receipt</h2>
            <div class="price-row">
              <span>Accommodation</span><span>{{ r.subtotal | money }}</span>
            </div>
            <div class="price-row">
              <span>Cleaning fee</span><span>{{ r.cleaningFee | money }}</span>
            </div>
            <div class="price-row">
              <span>Service fee</span><span>{{ r.serviceFee | money }}</span>
            </div>
            <div class="price-row total">
              <span>Total</span><span>{{ r.total | money }}</span>
            </div>
            @if (payment; as p) {
              <p class="text-sm mt-4">{{ p.status }} · {{ p.mode }}</p>
              <p class="receipt-ref muted">{{ p.reference }}</p>
            }
            <p class="muted text-sm mt-3">
              Payments and full refunds are simulated. No real charge or card information is
              involved.
            </p>
          </section>
          @if (canCancel()) {
            <section class="panel">
              <h2>Cancel your stay</h2>
              <p class="muted">
                Cancellation is available before your check-in date. It releases the dates and
                records a full simulated refund.
              </p>
              <form (ngSubmit)="cancel()" class="stack mt-4">
                <label for="cancellation-reason">Cancellation reason</label>
                <textarea
                  id="cancellation-reason"
                  name="reason"
                  required
                  minlength="3"
                  maxlength="500"
                  [(ngModel)]="reason"
                  rows="3"
                ></textarea>
                <label class="agreement"
                  ><input type="checkbox" name="cancel-agreed" [(ngModel)]="cancelAgreed" /><span
                    >I understand this cancellation is final.</span
                  ></label
                >
                <button
                  class="btn danger"
                  [disabled]="busy || !cancelAgreed || reason.trim().length < 3"
                >
                  {{ busy ? 'Cancelling…' : 'Cancel reservation' }}
                </button>
              </form>
            </section>
          }
          @if (actionError) {
            <p class="error-text" role="alert">{{ actionError }}</p>
          }
          @if (notice) {
            <p class="success" role="status">{{ notice }}</p>
          }
        </aside>
      </div>
    }
  </main>`,
  styles: [
    '.trip-photo{width:100%;max-height:300px;object-fit:cover;border-radius:12px}.receipt-ref{overflow-wrap:anywhere;font-size:12px}textarea{width:100%;border:1px solid #ddd;border-radius:12px;padding:12px}',
  ],
})
export class TripDetailComponent implements OnInit {
  private readonly api = inject(ReservationApiService);
  private readonly sharedApi = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  trip: Reservation | null = null;
  payment: PaymentReceipt | null = null;
  loading = true;
  error = '';
  reason = '';
  cancelAgreed = false;
  busy = false;
  actionError = '';
  notice = '';
  aiBusy = false;
  aiText = '';
  aiMode = '';
  aiNotice = '';
  aiError = '';
  readonly today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => void this.load());
  }
  async load() {
    this.loading = true;
    this.error = '';
    this.trip = null;
    this.payment = null;
    this.aiText = '';
    this.aiError = '';
    this.notice = '';
    this.actionError = '';
    try {
      const id = this.route.snapshot.paramMap.get('id') ?? '';
      [this.trip, this.payment] = await Promise.all([this.api.get(id), this.api.payment(id)]);
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }
  canCancel() {
    return (
      !!this.trip &&
      ['PENDING', 'CONFIRMED'].includes(this.trip.status) &&
      this.trip.checkIn > this.today
    );
  }
  async cancel() {
    if (!this.trip || this.busy || !this.cancelAgreed || this.reason.trim().length < 3) return;
    this.busy = true;
    this.actionError = '';
    try {
      this.trip = await this.api.cancel(this.trip.id, this.reason.trim());
      this.payment = await this.api.payment(this.trip.id);
      this.notice = 'Reservation cancelled. A full simulated refund has been recorded.';
    } catch (error) {
      this.actionError = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
  async plan() {
    if (!this.trip || this.aiBusy) return;
    this.aiBusy = true;
    this.aiError = '';
    try {
      const property = await this.sharedApi.property(this.trip.propertyId);
      const result = await this.sharedApi.assist(
        'reservation-itinerary',
        JSON.stringify({
          destination: property.destination,
          checkIn: this.trip.checkIn,
          checkOut: this.trip.checkOut,
          guests: this.trip.guests,
        }),
      );
      this.aiText = result.text;
      this.aiMode = result.mode;
      this.aiNotice = result.notice ?? '';
    } catch (error) {
      this.aiError = errorMessage(error);
    } finally {
      this.aiBusy = false;
    }
  }
}
