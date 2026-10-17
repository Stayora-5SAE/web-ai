import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { FeedbackComponent } from '../shared/feedback.component';
import { AiMarkdownComponent } from '../shared/ai-markdown.component';
import { PropertyReviews, ReviewApiService } from './review-api.service';
import { ReviewFeedComponent } from './review-feed.component';
import { ReputationComponent } from './reputation.component';
import { IdentityService } from '../accounts/identity.service';

@Component({
  selector: 'app-property-reviews',
  standalone: true,
  imports: [
    ReviewFeedComponent,
    ReputationComponent,
    CommonModule,
    RouterLink,
    FeedbackComponent,
    AiMarkdownComponent,
  ],
  template: `
    <main id="main" class="container page">
      <a [routerLink]="['/properties', propertyId]">← Back to the property</a>
      <span class="eyebrow block mt-6">The Stayora community</span>
      <h1 class="mt-2">Stories from verified stays.</h1>
      <p class="muted">Reviews written by guests after their stay.</p>
      <app-feedback [loading]="loading" [error]="error" (retry)="load()" />
      @if (data && !loading && !error) {
        <section class="panel reputation mt-6 mb-6" aria-label="Property rating">
          <app-reputation [data]="data" [distribution]="true" />
          @if (!identity.account() || identity.account()?.role === 'GUEST') {
            <a routerLink="/reviews" class="btn secondary mt-4">Review your stay</a>
          }
        </section>
        @if (data.reviewCount === 0) {
          <p class="empty">
            No guest stories yet. Be the first to share your experience after a completed stay.
          </p>
        } @else {
          <details class="panel mt-6" aria-label="Rating summary assistant">
            <summary>Rating snapshot assistant</summary>
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
              <app-ai-markdown class="mt-3" [text]="aiText" />
              <p class="muted">{{ aiMode }} assistance · Check this summary before sharing.</p>
              @if (aiNotice) {
                <p class="text-xs muted">{{ aiNotice }}</p>
              }
            }
          </details>
        }
        <app-review-feed [reviews]="data.reviews" />
      }
    </main>
  `,
  styleUrl: './review-ui.css',
})
export class PropertyReviewsComponent implements OnInit {
  readonly identity = inject(IdentityService);
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
  aiNotice = '';
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
      this.aiNotice = response.notice ?? '';
    } catch (e) {
      this.aiError = errorMessage(e);
    } finally {
      this.aiLoading = false;
    }
  }
}
