import { ReviewHighlightComponent } from '../reviews/review-highlight.component';
import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { Reservation } from '../core/models';
import { FormsModule } from '@angular/forms';
import { AvailabilityApi, HostPerformance } from './availability-api.service';
import { FeedbackComponent } from '../shared/feedback.component';
import { IconComponent } from '../shared/icon.component';
import { MoneyPipe } from '../shared/money.pipe';
import { AiMarkdownComponent } from '../shared/ai-markdown.component';
@Component({
  selector: 'app-today',
  standalone: true,
  imports: [
    AiMarkdownComponent,
    ReviewHighlightComponent,
    DatePipe,
    FormsModule,
    RouterLink,
    FeedbackComponent,
    IconComponent,
    MoneyPipe,
  ],
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
        <a class="btn secondary" routerLink="/host/listings/new"
          ><app-icon name="plus" />Create listing</a
        >
      </div>
    </div>
    <div class="divider"></div>
    <app-feedback [loading]="loading" [error]="error" (retry)="load()" />
    @if (dashboard; as d) {
      <app-review-highlight [host]="true" class="block mb-6" />
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
              <p class="muted">
                Stay connected with your guests. Open your inbox to reply to inquiries and
                reservation messages.
              </p>
            </div>
            <a class="btn secondary mt-4" routerLink="/host/messages">Open inbox</a>
          </section>
        </div>
        <aside>
          <section class="panel">
            <h2>{{ d.month + '-01' | date: 'MMMM' }} performance</h2>
            <label class="block mt-4"
              >Reporting month<input
                type="month"
                name="month"
                [(ngModel)]="month"
                (ngModelChange)="load()"
            /></label>
            <p class="text-xs muted">Computed from persisted reservations</p>
            <div class="stat">
              <p>Occupancy</p>
              <strong>{{ d.occupancy }}%</strong>
              <p class="text-xs muted">
                {{ d.bookedNights }} confirmed nights / {{ d.sellableNights }} sellable nights ·
                {{ d.blockedNights }} owner-blocked nights excluded
              </p>
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
              Summarize aggregate performance. No guest names or reservation details are sent.
            </p>
            <button class="btn secondary full mt-4" [disabled]="insightBusy" (click)="summarize()">
              {{ insightBusy ? 'Preparing summary…' : 'Generate host summary' }}
            </button>
            @if (insightText) {
              <span class="status mt-4">AI mode: {{ insightMode }}</span>
              @if (insightNotice) {
                <p class="text-xs muted mt-3">{{ insightNotice }}</p>
              }
              <app-ai-markdown class="mt-4" [text]="insightText" />
              <p class="text-xs muted mt-3">
                Recommendations need human review. AI cannot alter your calendar or prices.
              </p>
            }
            @if (insightError) {
              <p class="error-text mt-4" role="alert">{{ insightError }}</p>
            }
          </section>
        </aside>
      </div>
    }
  </main>`,
})
export class TodayComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly availability = inject(AvailabilityApi);
  dashboard: HostPerformance | null = null;
  month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  insightBusy = false;
  insightText = '';
  insightMode = '';
  insightNotice = '';
  insightError = '';
  loading = true;
  error = '';
  busy = false;
  actionError = '';
  get pending() {
    return this.dashboard?.reservations.filter((r) => r.status === 'PENDING') ?? [];
  }
  get arrival() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return this.dashboard?.reservations.find((r) => r.status === 'CONFIRMED' && r.checkIn >= today);
  }
  ngOnInit() {
    void this.load();
  }
  async load() {
    this.loading = true;
    this.error = '';
    try {
      this.dashboard = await this.availability.dashboard(this.month);
      this.insightText = '';
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.loading = false;
    }
  }
  async decide(r: Reservation, status: 'CONFIRMED' | 'DECLINED') {
    if (this.busy) return;
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
  async summarize() {
    if (!this.dashboard || this.insightBusy) return;
    this.insightBusy = true;
    this.insightError = '';
    const d = this.dashboard;
    try {
      const response = await this.api.assist(
        'host-summary',
        `month=${d.month}; publishedProperties=${d.activeListings}; confirmedNights=${d.bookedNights}; sellableNights=${d.sellableNights}; ownerBlockedNights=${d.blockedNights}; occupancyPercent=${d.occupancy}; simulatedPayoutTND=${d.payout.toFixed(3)}; pendingRequests=${d.pendingRequests}`,
      );
      this.insightText = response.text;
      this.insightMode = response.mode;
      this.insightNotice = response.notice ?? '';
    } catch (error) {
      this.insightError = errorMessage(error);
    } finally {
      this.insightBusy = false;
    }
  }
}
