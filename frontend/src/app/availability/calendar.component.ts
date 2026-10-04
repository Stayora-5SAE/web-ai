import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { CalendarData, Property, Reservation } from '../core/models';
import { FeedbackComponent } from '../shared/feedback.component';
import { IconComponent } from '../shared/icon.component';
import { MoneyPipe } from '../shared/money.pipe';
interface CalendarDay {
  date: string;
  day: number;
  booking?: Reservation;
  blocked: boolean;
}
@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, FeedbackComponent, IconComponent, MoneyPipe],
  template: ` <main id="main" class="container page">
    <div class="page-intro">
      <div>
        <h1>Calendar & pricing</h1>
        <p class="muted">Your reservations and availability, all in one place.</p>
      </div>
      <label
        >Property<select name="property" [(ngModel)]="propertyId" (ngModelChange)="loadCalendar()">
          @for (p of properties; track p.id) {
            <option [value]="p.id">{{ p.title }}</option>
          }
        </select></label
      >
    </div>
    <app-feedback [loading]="loading" [error]="error" (retry)="load()" />
    @if (!loading && !error && property) {
      <div class="calendar-layout">
        <section class="panel">
          <div class="calendar-controls">
            <h1>{{ month | date: 'MMMM yyyy' }}</h1>
            <div class="flex gap-2">
              <button class="icon-button" aria-label="Previous month" (click)="move(-1)">‹</button
              ><button class="btn secondary small" (click)="today()">Today</button
              ><button class="icon-button" aria-label="Next month" (click)="move(1)">›</button>
            </div>
          </div>
          <div class="calendar-grid">
            @for (day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; track day) {
              <span>{{ day }}</span>
            }
            @for (cell of cells; track $index) {
              @if (cell) {
                <button
                  class="calendar-day"
                  [class.booked]="cell.booking?.status === 'CONFIRMED'"
                  [class.pending]="cell.booking?.status === 'PENDING'"
                  [class.blocked]="cell.blocked"
                  [class.selected]="selected?.id === cell.booking?.id && !!selected"
                  (click)="select(cell)"
                  [attr.aria-label]="
                    cell.date +
                    ' — ' +
                    (cell.booking?.status || (cell.blocked ? 'Blocked' : 'Available'))
                  "
                >
                  <strong>{{ cell.day }}</strong
                  ><small class="day-full">{{
                    cell.booking?.status ||
                      (cell.blocked ? 'Blocked' : (property.nightlyPrice | money))
                  }}</small
                  ><small class="day-compact" aria-hidden="true">{{ compact(cell) }}</small>
                </button>
              } @else {
                <div class="calendar-day spacer" aria-hidden="true"></div>
              }
            }
          </div>
          <div class="calendar-legend">
            <span>● Confirmed</span><span>○ Pending request</span><span>▧ Owner block</span
            ><span>Dates use check-in inclusive / check-out exclusive</span>
          </div>
        </section>
        <aside>
          @if (selected; as r) {
            <section class="panel">
              <span class="status" [class.pending]="r.status === 'PENDING'">{{ r.status }}</span>
              <h2 class="editorial mt-4">
                {{ r.checkIn | date: 'MMM d' }} – {{ r.checkOut | date: 'MMM d, yyyy' }}
              </h2>
              <div class="inset">
                <h3>{{ r.guest.name }}</h3>
                <p class="muted text-sm">{{ r.guests }} guests · {{ r.propertyTitle }}</p>
              </div>
              <div class="divider"></div>
              <h3>Host payout breakdown</h3>
              <div class="price-row">
                <span>Accommodation</span><span>{{ r.subtotal | money }}</span>
              </div>
              <div class="price-row">
                <span>Cleaning</span><span>{{ r.cleaningFee | money }}</span>
              </div>
              <div class="price-row total">
                <span>Demo payout</span><span>{{ r.subtotal + r.cleaningFee | money }}</span>
              </div>
              <a class="btn full mt-4" [routerLink]="['/host/reservations', r.id]"
                >View reservation <app-icon name="arrow"
              /></a>
            </section>
          } @else {
            <section class="panel">
              <h2>{{ selectedDate ? 'Selected day' : 'Your calendar' }}</h2>
              <p class="muted">{{ selectedDate || 'Choose a reservation to see its details.' }}</p>
              <p class="mt-4">{{ selectedReason }}</p>
              <p class="text-sm muted mt-4">Availability and pricing editing are coming soon.</p>
            </section>
          }
          <div class="note mt-6">
            <app-icon name="shield" />Pending requests hold their dates until the host accepts or
            declines.
          </div>
        </aside>
      </div>
    }
  </main>`,
})
export class CalendarComponent implements OnInit {
  private readonly api = inject(ApiService);
  compact(cell: CalendarDay): string {
    return cell.booking
      ? cell.booking.status === 'CONFIRMED'
        ? '●'
        : '○'
      : cell.blocked
        ? '▧'
        : (this.property?.nightlyPrice ?? 0).toFixed(0);
  }
  private readonly route = inject(ActivatedRoute);
  properties: Property[] = [];
  propertyId = '';
  data: CalendarData = { reservations: [], blocks: [] };
  selected: Reservation | null = null;
  selectedDate = '';
  selectedReason = '';
  month = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  loading = true;
  error = '';
  get property() {
    return this.properties.find((p) => p.id === this.propertyId);
  }
  get cells(): (CalendarDay | null)[] {
    const y = this.month.getFullYear(),
      m = this.month.getMonth(),
      first = (new Date(y, m, 1).getDay() + 6) % 7;
    const cells: (CalendarDay | null)[] = Array(first).fill(null);
    for (let day = 1; day <= new Date(y, m + 1, 0).getDate(); day++) {
      const date = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        date,
        day,
        booking: this.data.reservations.find(
          (r) => r.status !== 'DECLINED' && r.checkIn <= date && r.checkOut > date,
        ),
        blocked: this.data.blocks.some((b) => b.startDate <= date && b.endDate > date),
      });
    }
    while (cells.length % 7) cells.push(null);
    return cells;
  }
  ngOnInit() {
    void this.load();
  }
  async load() {
    this.loading = true;
    this.error = '';
    try {
      this.properties = await this.api.hostListings();
      this.propertyId =
        this.route.snapshot.queryParamMap.get('propertyId') || this.properties[0]?.id || '';
      await this.loadCalendar();
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.loading = false;
    }
  }
  async loadCalendar() {
    if (!this.propertyId) return;
    this.loading = true;
    this.error = '';
    this.selected = null;
    try {
      this.data = await this.api.calendar(this.propertyId);
      this.selected = this.data.reservations.find((r) => r.status !== 'DECLINED') ?? null;
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.loading = false;
    }
  }
  move(amount: number) {
    this.month = new Date(this.month.getFullYear(), this.month.getMonth() + amount, 1);
  }
  today() {
    this.month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }
  select(cell: CalendarDay) {
    this.selected = cell.booking ?? null;
    this.selectedDate = cell.date;
    this.selectedReason = cell.blocked
      ? 'This date is blocked for an owner stay.'
      : cell.booking
        ? ''
        : 'This date is available for guests.';
  }
}
