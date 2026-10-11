import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { Property, Reservation } from '../core/models';
import {
  AvailabilityApi,
  HostCalendar,
  OwnerBlock,
  PriceOverride,
} from './availability-api.service';
import { FeedbackComponent } from '../shared/feedback.component';
import { IconComponent } from '../shared/icon.component';
import { MoneyPipe } from '../shared/money.pipe';
interface CalendarDay {
  date: string;
  day: number;
  booking?: Reservation;
  blocked: boolean;
  nightlyPrice: number;
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
        >Property<select
          name="property"
          [(ngModel)]="propertyId"
          (ngModelChange)="loadCalendar()"
          [disabled]="saving"
        >
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
                    cell.booking?.status || (cell.blocked ? 'Blocked' : (cell.nightlyPrice | money))
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
              <p class="text-sm muted mt-4">
                Select a date to block nights or set a nightly price.
              </p>
            </section>
          }
          <section class="panel mt-6">
            <h2>{{ blockId ? 'Edit owner block' : 'Block unavailable nights' }}</h2>
            <form (ngSubmit)="saveBlock()" class="stack mt-4">
              <label
                >From<input
                  type="date"
                  name="blockStart"
                  [(ngModel)]="blockStart"
                  [min]="minimumDate"
                  required
              /></label>
              <label
                >Until (exclusive)<input
                  type="date"
                  name="blockEnd"
                  [(ngModel)]="blockEnd"
                  [min]="blockStart || minimumDate"
                  required
              /></label>
              <label
                >Reason<input name="reason" [(ngModel)]="reason" maxlength="120" required
              /></label>
              <button class="btn full" [disabled]="saving">
                {{ blockId ? 'Update block' : 'Save block' }}
              </button>
              @if (blockId) {
                <button type="button" class="btn secondary" (click)="resetEditor()">
                  Cancel editing
                </button>
              }
            </form>
            @for (block of data.blocks; track block.id) {
              <div class="inset mt-4">
                <strong>{{ block.startDate }} – {{ block.endDate }}</strong>
                <p>{{ block.reason }}</p>
                <div class="flex gap-2 mt-2">
                  <button
                    class="btn small secondary"
                    [disabled]="saving"
                    (click)="editBlock(block)"
                  >
                    Edit</button
                  ><button
                    class="btn small danger"
                    [disabled]="saving"
                    (click)="removeBlock(block.id)"
                  >
                    Remove
                  </button>
                </div>
              </div>
            } @empty {
              <p class="text-sm muted mt-4">No owner blocks.</p>
            }
          </section>
          <section class="panel mt-6">
            <h2>{{ priceId ? 'Edit nightly price' : 'Override nightly price' }}</h2>
            <form (ngSubmit)="savePrice()" class="stack mt-4">
              <label
                >Date<input
                  type="date"
                  name="priceDate"
                  [(ngModel)]="priceDate"
                  [min]="minimumDate"
                  required
              /></label>
              <label
                >Nightly price (TND)<input
                  type="number"
                  name="nightlyPrice"
                  [(ngModel)]="nightlyPrice"
                  min="0.001"
                  max="100000"
                  step="0.001"
                  required
              /></label>
              <button class="btn full" [disabled]="saving">
                {{ priceId ? 'Update price' : 'Save price' }}
              </button>
            </form>
            <p class="text-xs muted mt-4">
              Unspecified dates use the property's base price. Existing reservations keep their
              confirmed amount.
            </p>
            @for (price of data.prices; track price.id) {
              <div class="inset mt-4">
                <strong>{{ price.date }} · {{ price.nightlyPrice | money }}</strong>
                <div class="flex gap-2 mt-2">
                  <button
                    class="btn small secondary"
                    [disabled]="saving"
                    (click)="editPrice(price)"
                  >
                    Edit</button
                  ><button
                    class="btn small danger"
                    [disabled]="saving"
                    (click)="removePrice(price.id)"
                  >
                    Remove
                  </button>
                </div>
              </div>
            } @empty {
              <p class="text-sm muted mt-4">No price overrides.</p>
            }
            @if (actionError) {
              <p class="error-text mt-4" role="alert">{{ actionError }}</p>
            }
            @if (notice) {
              <p class="mt-4" role="status">{{ notice }}</p>
            }
          </section>
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
  private readonly availability = inject(AvailabilityApi);
  compact(cell: CalendarDay): string {
    return cell.booking
      ? cell.booking.status === 'CONFIRMED'
        ? '●'
        : '○'
      : cell.blocked
        ? '▧'
        : cell.nightlyPrice.toFixed(0);
  }
  private readonly route = inject(ActivatedRoute);
  properties: Property[] = [];
  propertyId = '';
  data: HostCalendar = { reservations: [], blocks: [], prices: [] };
  saving = false;
  actionError = '';
  notice = '';
  blockId = '';
  priceId = '';
  blockStart = '';
  blockEnd = '';
  reason = 'Owner stay';
  priceDate = '';
  nightlyPrice = 0;
  readonly minimumDate = this.localDate(new Date());
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
          (r) =>
            ['PENDING', 'CONFIRMED'].includes(r.status) && r.checkIn <= date && r.checkOut > date,
        ),
        blocked: this.data.blocks.some((b) => b.startDate <= date && b.endDate > date),
        nightlyPrice:
          this.data.prices.find((p) => p.date === date)?.nightlyPrice ??
          this.property?.nightlyPrice ??
          0,
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
    this.resetEditor();
    try {
      this.data = await this.availability.calendar(this.propertyId);
      this.nightlyPrice = this.property?.nightlyPrice ?? 0;
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
    this.blockStart = cell.date;
    const nextDay = new Date(cell.date + 'T12:00:00');
    nextDay.setDate(nextDay.getDate() + 1);
    this.blockEnd = this.localDate(nextDay);
    this.priceDate = cell.date;
    this.nightlyPrice = cell.nightlyPrice;
    this.blockId = '';
    this.priceId = '';
    this.selectedReason = cell.blocked
      ? 'This date is blocked for an owner stay.'
      : cell.booking
        ? ''
        : 'This date is available for guests.';
  }
  private localDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  resetEditor() {
    this.blockId = '';
    this.priceId = '';
    this.blockStart = '';
    this.blockEnd = '';
    this.priceDate = '';
    this.reason = 'Owner stay';
    this.selectedDate = '';
    this.selectedReason = '';
  }
  editBlock(block: OwnerBlock) {
    this.blockId = block.id;
    this.blockStart = block.startDate;
    this.blockEnd = block.endDate;
    this.reason = block.reason;
  }
  editPrice(price: PriceOverride) {
    this.priceId = price.id;
    this.priceDate = price.date;
    this.nightlyPrice = price.nightlyPrice;
  }
  private async mutate(action: () => Promise<unknown>, message: string) {
    if (this.saving) return;
    this.saving = true;
    this.actionError = '';
    this.notice = '';
    try {
      await action();
      this.data = await this.availability.calendar(this.propertyId);
      this.resetEditor();
      this.notice = message;
    } catch (error) {
      this.actionError = errorMessage(error);
    } finally {
      this.saving = false;
    }
  }
  saveBlock() {
    return this.mutate(
      () =>
        this.availability.saveBlock(this.blockId, {
          propertyId: this.propertyId,
          startDate: this.blockStart,
          endDate: this.blockEnd,
          reason: this.reason,
        }),
      'Availability saved.',
    );
  }
  removeBlock(id: string) {
    return this.mutate(() => this.availability.removeBlock(id), 'Block removed.');
  }
  savePrice() {
    return this.mutate(
      () =>
        this.availability.savePrice(this.priceId, {
          propertyId: this.propertyId,
          date: this.priceDate,
          nightlyPrice: this.nightlyPrice,
        }),
      'Nightly price saved.',
    );
  }
  removePrice(id: string) {
    return this.mutate(() => this.availability.removePrice(id), 'Base nightly price restored.');
  }
}
