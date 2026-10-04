import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService, errorMessage } from '../core/api.service';
import { Reservation } from '../core/models';
import { FeedbackComponent } from '../shared/feedback.component';
import { IconComponent } from '../shared/icon.component';
import { MoneyPipe } from '../shared/money.pipe';
@Component({
  selector: 'app-host-reservation',
  standalone: true,
  imports: [DatePipe, RouterLink, FeedbackComponent, IconComponent, MoneyPipe],
  template: ` <main id="main" class="container page">
    <a routerLink="/host/today" class="inline-flex items-center gap-2"
      ><app-icon name="back" /> Back to reservations</a
    ><app-feedback [loading]="loading" [error]="error" (retry)="load()" />
    @if (reservation; as r) {
      <div class="reservation-banner mt-6">
        <div>
          <h1>Reservation {{ r.reference }}</h1>
          <p class="muted mt-2">
            {{ r.checkIn | date: 'mediumDate' }} – {{ r.checkOut | date: 'mediumDate' }}
          </p>
        </div>
        <span
          class="status"
          [class.pending]="r.status === 'PENDING'"
          [class.declined]="r.status === 'DECLINED'"
          >{{ r.status }}</span
        >
      </div>
      <div class="two-columns">
        <div class="stack">
          <section class="panel">
            <div class="guest-profile">
              <span class="large-avatar">SB</span>
              <div>
                <h2 class="editorial mb-0">{{ r.guest.name }}</h2>
                <p class="muted">Demo guest · {{ r.guests }} adults</p>
              </div>
            </div>
            <div class="divider"></div>
            <p class="text-sm">{{ r.guest.email }}</p>
            <button class="btn secondary small mt-4" disabled title="Messaging module coming soon">
              <app-icon name="message" /> Message guest · soon
            </button>
          </section>
          <section class="panel">
            <div class="reservation-property">
              <img [src]="r.image" [alt]="r.propertyTitle" />
              <div>
                <h3>{{ r.propertyTitle }}</h3>
                <p class="muted mt-2">Entire stay · {{ r.guests }} guests</p>
                <a
                  routerLink="/host/calendar"
                  [queryParams]="{ propertyId: r.propertyId }"
                  class="inline-flex items-center gap-2 mt-4 text-sm"
                  >View calendar <app-icon name="arrow"
                /></a>
              </div>
            </div>
            <div class="reservation-dates">
              <div>
                <small>CHECK-IN</small><strong>{{ r.checkIn | date: 'MMM d, yyyy' }}</strong>
                <p class="text-xs muted">From 3:00 PM</p>
              </div>
              <div>
                <small>CHECK-OUT</small><strong>{{ r.checkOut | date: 'MMM d, yyyy' }}</strong>
                <p class="text-xs muted">Before 11:00 AM</p>
              </div>
            </div>
          </section>
          <section class="panel">
            <h2><app-icon name="key" /> Smart keycode & access information</h2>
            <div class="inset">
              <span class="eyebrow">Demonstration code</span>
              <div class="flex items-center justify-between mt-3">
                <strong class="keycode">8492#</strong
                ><button class="btn secondary small" (click)="copy()">Copy demo code</button>
              </div>
              <p class="text-xs muted mt-3">
                No physical lock is connected. This code is illustrative and cannot grant access.
              </p>
            </div>
            @if (copyStatus) {
              <p role="status" class="text-sm mt-3">{{ copyStatus }}</p>
            }
          </section>
          <section class="panel">
            <h2>Guest communication</h2>
            <p class="muted">Keep in touch with your guest. Messaging is coming soon.</p>
            <button class="btn secondary mt-4" disabled>Send message · coming soon</button>
          </section>
        </div>
        <aside>
          <section class="panel">
            <span class="eyebrow">Host payout · simulated</span>
            <h1 class="mt-3">{{ r.subtotal + r.cleaningFee | money }}</h1>
            <p class="text-xs muted mt-2">{{ r.paymentStatus }} payment · No real money movement</p>
            <div class="divider"></div>
            <div class="price-row">
              <span>Accommodation</span><span>{{ r.subtotal | money }}</span>
            </div>
            <div class="price-row">
              <span>Cleaning fee</span><span>{{ r.cleaningFee | money }}</span>
            </div>
            <div class="price-row">
              <span>Guest service fee</span><span>{{ r.serviceFee | money }}</span>
            </div>
            <div class="price-row total">
              <span>Guest total</span><span>{{ r.total | money }}</span>
            </div>
            @if (r.status === 'PENDING') {
              <div class="stack mt-6">
                <button class="btn full" [disabled]="busy" (click)="decide('CONFIRMED')">
                  <app-icon name="check" />Accept request</button
                ><button class="btn danger full" [disabled]="busy" (click)="decide('DECLINED')">
                  Decline request
                </button>
              </div>
            }
            @if (actionError) {
              <p class="error-text" role="alert">{{ actionError }}</p>
            }
          </section>
          <section class="panel">
            <h2><app-icon name="shield" /> Policy & protection</h2>
            <p class="muted text-sm">
              Requests hold their dates while pending. Declining releases availability. Accepting
              confirms the reservation. Payments remain simulated.
            </p>
          </section>
        </aside>
      </div>
    }
  </main>`,
})
export class HostReservationComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  reservation: Reservation | null = null;
  loading = true;
  error = '';
  busy = false;
  actionError = '';
  copyStatus = '';
  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => void this.load());
  }
  async load() {
    this.loading = true;
    this.error = '';
    this.reservation = null;
    try {
      this.reservation = await this.api.reservation(this.route.snapshot.paramMap.get('id') ?? '');
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.loading = false;
    }
  }
  async decide(status: 'CONFIRMED' | 'DECLINED') {
    if (!this.reservation) return;
    this.busy = true;
    this.actionError = '';
    try {
      this.reservation = await this.api.decide(this.reservation.id, status);
    } catch (e) {
      this.actionError = errorMessage(e);
    } finally {
      this.busy = false;
    }
  }
  async copy() {
    try {
      await navigator.clipboard.writeText('8492#');
      this.copyStatus = 'Demo code copied.';
    } catch {
      this.copyStatus = 'Copy unavailable. Demo code: 8492#';
    }
  }
}
