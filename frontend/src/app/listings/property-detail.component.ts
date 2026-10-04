import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService, errorMessage } from '../core/api.service';
import { Property, Quote } from '../core/models';
import { SelectionService } from '../core/selection.service';
import { FeedbackComponent } from '../shared/feedback.component';
import { IconComponent } from '../shared/icon.component';
import { MoneyPipe } from '../shared/money.pipe';
@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, FeedbackComponent, IconComponent, MoneyPipe],
  template: ` <main id="main" class="container page">
    <a
      routerLink="/search"
      [queryParams]="selection.params()"
      class="inline-flex items-center gap-2"
      ><app-icon name="back" /> Back to stays</a
    ><app-feedback [loading]="loading" [error]="error" (retry)="load()" />
    @if (property; as p) {
      <div class="property-heading">
        <div>
          <h1>{{ p.title }}</h1>
          <p class="mt-2">
            <app-icon name="star" /> {{ p.rating }} · {{ p.reviewCount }} reviews ·
            {{ p.destination }}
          </p>
        </div>
        <div class="flex gap-3">
          <button class="btn secondary small" disabled title="Wishlist module coming soon">
            <app-icon name="heart" /> Save · coming soon
          </button>
        </div>
      </div>
      <div class="gallery">
        @for (image of photos; track $index) {
          <img
            [src]="image"
            [alt]="p.title + ' — photo ' + ($index + 1)"
            [attr.loading]="$index === 0 ? 'eager' : 'lazy'"
          />
        }
      </div>
      <div class="property-information">
        <section>
          <div class="flex justify-between items-center">
            <div>
              <h2>
                Entire {{ p.category === 'Houses' ? 'home' : 'stay' }} hosted by
                {{ p.hostName }}
              </h2>
              <p class="muted mt-1">
                {{ p.capacity }} guests · {{ p.bedrooms }} bedrooms · {{ p.bathrooms }} bathrooms
              </p>
            </div>
            <span class="large-avatar">{{ p.hostName.charAt(0) }}</span>
          </div>
          <div class="divider"></div>
          <div class="feature-row">
            <app-icon name="wifi" />
            <div>
              <h3>Thoughtful amenities</h3>
              <p>A comfortable space to work, rest, and feel at home.</p>
            </div>
          </div>
          <div class="feature-row">
            <app-icon name="key" />
            <div>
              <h3>Self check-in with smart keypad</h3>
              <p>Smart-lock access is simulated in this development demo.</p>
            </div>
          </div>
          <div class="divider"></div>
          <h2>About this sanctuary</h2>
          <p class="muted mt-4">{{ p.description }}</p>
          <div class="divider"></div>
          <h2>Where you will sleep</h2>
          <div class="inset mt-5">
            <app-icon name="home" />
            <h3 class="mt-3">{{ p.bedrooms }} welcoming bedroom{{ p.bedrooms > 1 ? 's' : '' }}</h3>
            <p class="muted mt-2">Thoughtfully prepared for a peaceful stay.</p>
          </div>
          <div class="divider"></div>
          <h2>Amenities</h2>
          <div class="amenities-grid">
            @for (amenity of p.amenities; track amenity) {
              <span><app-icon name="check" />{{ amenity }}</span>
            }
          </div>
          <div class="divider"></div>
          <h2>House rules & stay policies</h2>
          <p class="muted mt-4">
            Check-in from 3:00 PM · Check-out by 11:00 AM. Respect your neighbors and the property.
            This baseline uses simulated payments; no real charges or refunds occur.
          </p>
        </section>
        <aside class="panel booking-panel">
          <h2>
            {{ p.nightlyPrice | money }} <span class="text-sm font-normal muted">/ night</span>
          </h2>
          <form (ngSubmit)="reserve()">
            <div class="booking-fields">
              <label
                >Check-in<input
                  name="checkIn"
                  type="date"
                  [(ngModel)]="selection.checkIn"
                  [min]="selection.today"
                  (ngModelChange)="quote = null"
                  required /></label
              ><label
                >Check-out<input
                  name="checkOut"
                  type="date"
                  [(ngModel)]="selection.checkOut"
                  [min]="selection.checkIn"
                  (ngModelChange)="quote = null"
                  required /></label
              ><label
                >Guests<select
                  name="guests"
                  [(ngModel)]="selection.guests"
                  (ngModelChange)="quote = null"
                >
                  @for (n of guestOptions; track n) {
                    <option [ngValue]="n">{{ n }} guests</option>
                  }
                </select></label
              >
            </div>
            <button
              type="button"
              class="btn secondary full"
              (click)="refreshQuote()"
              [disabled]="busy"
            >
              Check price & availability
            </button>
            @if (quote; as q) {
              <div class="price-row">
                <span>{{ q.nightlyPrice | money }} × {{ q.nights }} nights</span
                ><span>{{ q.subtotal | money }}</span>
              </div>
              <div class="price-row">
                <span>Cleaning fee</span><span>{{ q.cleaningFee | money }}</span>
              </div>
              <div class="price-row">
                <span>Stayora service fee</span><span>{{ q.serviceFee | money }}</span>
              </div>
              <div class="price-row total">
                <span>Total</span><span>{{ q.total | money }}</span>
              </div>
            }
            @if (bookingError) {
              <p class="error-text" role="alert">{{ bookingError }}</p>
            }
            <button class="btn full mt-4" [disabled]="busy">
              {{ busy ? 'Checking…' : 'Reserve' }}<app-icon name="arrow" />
            </button>
            <p class="text-xs muted text-center mt-3">No real charge · Demo payment at checkout</p>
          </form>
        </aside>
      </div>
    }
  </main>`,
})
export class PropertyDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly selection = inject(SelectionService);
  property: Property | null = null;
  quote: Quote | null = null;
  loading = true;
  error = '';
  bookingError = '';
  busy = false;
  get photos() {
    const images = this.property?.images ?? [];
    return Array.from({ length: 5 }, (_, i) => images[i % images.length]);
  }
  get guestOptions() {
    return Array.from({ length: this.property?.capacity ?? 1 }, (_, i) => i + 1);
  }
  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.selection.restore(this.route.snapshot.queryParamMap);
      void this.load();
    });
  }
  async load() {
    this.loading = true;
    this.error = '';
    this.property = null;
    try {
      this.property = await this.api.property(this.route.snapshot.paramMap.get('id') ?? '');
      this.selection.guests = Math.min(this.selection.guests, this.property.capacity);
      await this.refreshQuote();
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.loading = false;
    }
  }
  async refreshQuote() {
    if (!this.property) return;
    this.busy = true;
    this.bookingError = '';
    this.quote = null;
    try {
      this.quote = await this.api.quote(this.selection.booking(this.property.id));
    } catch (e) {
      this.bookingError = errorMessage(e);
    } finally {
      this.busy = false;
    }
  }
  async reserve() {
    await this.refreshQuote();
    if (this.quote && this.property)
      void this.router.navigate(['/reservations/review'], {
        queryParams: { ...this.selection.params(), propertyId: this.property.id },
      });
  }
}
