import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { Dashboard, Reservation } from '../core/models';
import { FeedbackComponent } from '../shared/feedback.component';
import { IconComponent } from '../shared/icon.component';
import { MoneyPipe } from '../shared/money.pipe';
@Component({
  selector: 'app-today',
  standalone: true,
  imports: [DatePipe, RouterLink, FeedbackComponent, IconComponent, MoneyPipe],
  template: ` <main id="main" class="container page">
    <div class="page-intro">
      <div>
        <span class="status">● Development demo · guest & host identities</span>
        <h1 class="mt-4">Welcome back, {{ dashboard?.host?.name || 'Nadia' }}</h1>
        <p class="muted">
          Here is your property activity · {{ dashboard?.activeListings ?? 0 }} published properties
        </p>
      </div>
      <div class="flex gap-3">
        <button
          class="btn secondary"
          disabled
          title="Listing editing is assigned to the listings module"
        >
          <app-icon name="plus" />Create listing · soon
        </button>
      </div>
    </div>
    <div class="divider"></div>
    <app-feedback [loading]="loading" [error]="error" (retry)="load()" />
    @if (dashboard; as d) {
      <div class="two-columns">
        <div class="stack">
          <section class="panel">
            <span class="eyebrow">Upcoming arrival</span>
            <h2 class="mt-2">Turnover & check-ins</h2>
            @if (arrival; as r) {
              <div class="dashboard-booking">
                <img [src]="r.image" [alt]="r.propertyTitle" />
                <div>
                  <h3>{{ r.guest.name }}</h3>
                  <p class="muted text-sm mt-1">{{ r.propertyTitle }} · {{ r.guests }} guests</p>
                  <p class="text-xs mt-2">
                    {{ r.checkIn | date: 'mediumDate' }} – {{ r.checkOut | date: 'mediumDate' }}
                  </p>
                  <div class="inset mt-4">
                    <p class="text-xs">Smart-lock keypad code · demo only</p>
                    <strong class="keycode">8492#</strong>
                    <p class="text-xs muted">No physical lock is connected.</p>
                  </div>
                  <div class="dashboard-actions">
                    <a class="btn small" [routerLink]="['/host/reservations', r.id]"
                      >View reservation <app-icon name="arrow"
                    /></a>
                  </div>
                </div>
              </div>
            } @else {
              <p class="empty">No upcoming confirmed arrivals.</p>
            }
          </section>
          <section class="panel pending-card">
            <div class="flex justify-between items-start">
              <div>
                <span class="status pending">Action needed</span>
                <h2 class="mt-3">Pending booking requests</h2>
              </div>
              <span class="text-xs muted">Host approval</span>
            </div>
            @for (r of pending; track r.id) {
              <div class="inset mb-4">
                <div class="flex justify-between gap-4">
                  <div>
                    <h3 class="editorial">{{ r.propertyTitle }}</h3>
                    <p class="muted text-sm">Request from {{ r.guest.name }}</p>
                    <p class="text-xs mt-2">
                      {{ r.checkIn | date: 'mediumDate' }} – {{ r.checkOut | date: 'mediumDate' }} ·
                      {{ r.guests }} guests
                    </p>
                  </div>
                  <strong>{{ r.total | money }}</strong>
                </div>
                <div class="dashboard-actions">
                  <button class="btn small" [disabled]="busy" (click)="decide(r, 'CONFIRMED')">
                    <app-icon name="check" /> Accept request</button
                  ><button
                    class="btn danger small"
                    [disabled]="busy"
                    (click)="decide(r, 'DECLINED')"
                  >
                    Decline</button
                  ><a class="btn secondary small" [routerLink]="['/host/reservations', r.id]"
                    >Details</a
                  >
                </div>
              </div>
            } @empty {
              <p class="empty">You're all caught up. No pending requests.</p>
            }
            @if (actionError) {
              <p class="error-text" role="alert">{{ actionError }}</p>
            }
          </section>
          <section class="panel">
            <h2><app-icon name="message" /> Recent messages</h2>
            <div class="inset">
              <p class="muted">Guest conversations will appear here. Messaging is coming soon.</p>
            </div>
            <button class="btn secondary mt-4" disabled>Send message · coming soon</button>
          </section>
        </div>
        <aside>
          <section class="panel">
            <h2>{{ d.month + '-01' | date: 'MMMM' }} performance</h2>
            <p class="text-xs muted">Computed from persisted reservations</p>
            <div class="stat">
              <p>Occupancy</p>
              <strong>{{ d.occupancy }}%</strong>
              <div class="progress"><span [style.width.%]="d.occupancy"></span></div>
            </div>
            <div class="stat">
              <p>Host payout</p>
              <strong>{{ d.payout | money }}</strong>
              <p class="text-xs muted">Confirmed stays checking in this month · simulated</p>
            </div>
            <div class="stat">
              <p>Active listings</p>
              <strong>{{ d.activeListings }} Properties</strong
              ><span class="status">Published</span>
            </div>
          </section>
          <section class="panel">
            <h2>Calendar glance</h2>
            @for (r of d.reservations.slice(0, 3); track r.id) {
              <a class="block mb-4" [routerLink]="['/host/reservations', r.id]"
                ><strong>{{ r.checkIn | date: 'MMM d' }} – {{ r.checkOut | date: 'MMM d' }}</strong>
                <p class="text-xs muted">{{ r.propertyTitle }} · {{ r.status }}</p></a
              >
            }
            <a class="btn sage full" routerLink="/host/calendar"
              >View calendar <app-icon name="arrow"
            /></a>
          </section>
          <section class="inset mt-6">
            <span class="eyebrow">Host insights & tips</span>
            <h3 class="mt-3">Hospitality starts with clarity</h3>
            <p class="muted mt-2">
              Keep your calendar current and review new requests. Try the Demo AI assistant for a
              mock host summary.
            </p>
          </section>
        </aside>
      </div>
    }
  </main>`,
})
export class TodayComponent implements OnInit {
  private readonly api = inject(ApiService);
  dashboard: Dashboard | null = null;
  loading = true;
  error = '';
  busy = false;
  actionError = '';
  get pending() {
    return this.dashboard?.reservations.filter((r) => r.status === 'PENDING') ?? [];
  }
  get arrival() {
    const today = new Date().toISOString().slice(0, 10);
    return this.dashboard?.reservations.find(
      (r) => r.status === 'CONFIRMED' && r.checkOut >= today,
    );
  }
  ngOnInit() {
    void this.load();
  }
  async load() {
    this.loading = true;
    this.error = '';
    try {
      const month = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
      this.dashboard = await this.api.dashboard(
        `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
      );
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.loading = false;
    }
  }
  async decide(r: Reservation, status: 'CONFIRMED' | 'DECLINED') {
    this.busy = true;
    this.actionError = '';
    try {
      await this.api.decide(r.id, status);
      await this.load();
    } catch (e) {
      this.actionError = errorMessage(e);
    } finally {
      this.busy = false;
    }
  }
}
