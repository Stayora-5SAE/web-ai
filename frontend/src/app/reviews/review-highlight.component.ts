import { Component, Input, OnChanges, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../core/api.service';
import { Reputation, PropertyReviews, ReviewApiService } from './review-api.service';
import { ReviewFeedComponent } from './review-feed.component';
import { ReputationComponent } from './reputation.component';

@Component({
  selector: 'app-review-highlight',
  standalone: true,
  imports: [RouterLink, ReviewFeedComponent, ReputationComponent],
  template: `
    <section
      class="panel reputation"
      [attr.aria-label]="
        host ? 'Hosting reputation' : guestId ? 'Guest reputation' : 'Guest reviews'
      "
    >
      <div class="review-heading">
        <div>
          <span class="eyebrow">{{
            host
              ? 'Your reputation · all time'
              : guestId
                ? 'From previous hosts'
                : 'From people who stayed here'
          }}</span>
          <h2 class="mt-2">
            {{
              host
                ? 'Hospitality that leaves a mark.'
                : guestId
                  ? 'Guest reviews'
                  : 'A stay worth talking about.'
            }}
          </h2>
        </div>
        @if (!guestId) {
          <a
            class="btn secondary"
            [routerLink]="host ? ['/host/reviews'] : ['/properties', propertyId, 'reviews']"
            >{{ host ? 'Reviews & performance' : 'See all reviews' }}</a
          >
        }
      </div>
      @if (loading) {
        <p class="muted" role="status">Loading reviews…</p>
      }
      @if (error) {
        <p class="error-text" role="alert">{{ error }}</p>
        <button class="btn secondary mt-3" (click)="load()">Retry reviews</button>
      }
      @if (data && !loading && !error) {
        <app-reputation [data]="data" />
        @if (host && data.reviewCount) {
          <p class="muted mt-4">
            {{ positivePercent }}% of guest reviews rated your stays 4 stars or higher.
          </p>
        }
        <app-review-feed
          [reviews]="data.reviews.slice(0, guestId ? 3 : 2)"
          [context]="host || !!guestId"
        />
      }
    </section>
  `,
  styleUrl: './review-ui.css',
})
export class ReviewHighlightComponent implements OnChanges {
  private readonly api = inject(ReviewApiService);
  @Input() host = false;
  @Input() propertyId = '';
  @Input() guestId = '';
  data: Reputation | PropertyReviews | null = null;
  loading = true;
  error = '';
  private request = 0;
  get positivePercent() {
    if (!this.data?.reviewCount) return 0;
    return Math.round(
      (this.data.reviews.filter((r) => r.rating >= 4).length / this.data.reviewCount) * 100,
    );
  }
  ngOnChanges() {
    void this.load();
  }
  async load() {
    const request = ++this.request;
    this.loading = true;
    this.error = '';
    try {
      const data = await (this.host
        ? this.api.reputation(true)
        : this.guestId
          ? this.api.guest(this.guestId)
          : this.api.property(this.propertyId));
      if (request === this.request) this.data = data;
    } catch (e) {
      if (request === this.request) this.error = errorMessage(e);
    } finally {
      if (request === this.request) this.loading = false;
    }
  }
}
