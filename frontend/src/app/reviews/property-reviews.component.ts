import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { FeedbackComponent } from '../shared/feedback.component';
import { PropertyReviews, ReviewApiService } from './review-api.service';
import { REVIEW_STYLES } from './reviews.component';

@Component({
  selector: 'app-property-reviews',
  standalone: true,
  imports: [CommonModule, RouterLink, FeedbackComponent],
  template: `
    <main class="shell review-shell">
      <a [routerLink]="['/properties', propertyId]">← Back to the property</a>
      <h1>Stories from verified stays.</h1>
      <p class="muted">Reviews written by guests after their stay.</p>
      <app-feedback [loading]="loading" [error]="error" (retry)="load()" />
      @if (data && !loading && !error) {
        <section class="rating-summary" aria-label="Property rating">
          <p class="rating-number">{{ data.rating | number: '1.2-2' }} <span>/ 5</span></p>
          <p>{{ data.reviewCount }} {{ data.reviewCount === 1 ? 'review' : 'reviews' }}</p>
          <a routerLink="/reviews" class="btn secondary">Review your stay</a>
        </section>
        @if (data.reviewCount === 0) {
          <p class="empty">
            No guest stories yet. Be the first to share your experience after a completed stay.
          </p>
        } @else {
          <section class="review-card" aria-label="Rating summary assistant">
            <h2>Rating snapshot</h2>
            <p class="muted">
              The assistant sees only the review count and average rating. Read the reviews for the
              details.
            </p>
            <button class="btn secondary" (click)="summarize()" [disabled]="aiLoading">
              {{ aiLoading ? 'Preparing…' : 'Summarize ratings' }}
            </button>
            @if (aiError) {
              <p class="error-text" role="alert">{{ aiError }}</p>
            }
            @if (aiText) {
              <p>{{ aiText }}</p>
              <p class="muted">{{ aiMode }} assistance · Check this summary before sharing.</p>
            }
          </section>
        }
        <div class="review-grid" style="margin-top:24px">
          @for (review of data.reviews; track review.id) {
            <article class="review-card">
              <h3>{{ review.authorName }}</h3>
              <p class="stars" [attr.aria-label]="review.rating + ' out of 5 stars'">
                {{ stars(review.rating) }}
              </p>
              <p>{{ review.body }}</p>
              <p class="muted">
                {{ review.createdAt | date
                }}{{ review.reservationId ? ' · Verified stay' : ' · Historical review' }}
              </p>
            </article>
          }
        </div>
      }
    </main>
  `,
  styles: [
    REVIEW_STYLES,
    '.rating-summary{padding:24px;margin:24px 0;background:#eef8f2;border-radius:20px}.rating-number{font-size:40px;font-weight:700;margin:0}.rating-number span{font-size:18px;font-weight:400}',
  ],
})
export class PropertyReviewsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reviews = inject(ReviewApiService);
  private readonly api = inject(ApiService);
  readonly propertyId =
    this.route.snapshot.paramMap.get('propertyId') ?? this.route.snapshot.paramMap.get('id') ?? '';
  data: PropertyReviews | null = null;
  loading = true;
  error = '';
  aiLoading = false;
  aiError = '';
  aiText = '';
  aiMode = '';
  ngOnInit() {
    void this.load();
  }
  async load() {
    this.loading = true;
    this.error = '';
    try {
      this.data = await this.reviews.property(this.propertyId);
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.loading = false;
    }
  }
  stars(rating: number) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }
  async summarize() {
    if (!this.data || this.aiLoading) return;
    this.aiLoading = true;
    this.aiError = '';
    this.aiText = '';
    try {
      const response = await this.api.assist(
        'review-summary',
        `reviews count=${this.data.reviewCount}; rating average=${Number(this.data.rating).toFixed(2)}`,
      );
      this.aiText = response.text;
      this.aiMode = response.mode;
    } catch (e) {
      this.aiError = errorMessage(e);
    } finally {
      this.aiLoading = false;
    }
  }
}
