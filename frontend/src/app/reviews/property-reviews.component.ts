import { PageContextDirective } from '../shared/page-context.directive';
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api.service';
import { FeedbackComponent } from '../shared/feedback.component';
import { PropertyReviews, ReviewApiService } from './review-api.service';
import { ReviewFeedComponent } from './review-feed.component';
import { ReputationComponent } from './reputation.component';
import { IdentityService } from '../accounts/identity.service';

@Component({
  selector: 'app-property-reviews',
  standalone: true,
  imports: [
    PageContextDirective,
    ReviewFeedComponent,
    ReputationComponent,
    CommonModule,
    RouterLink,
    FeedbackComponent,
  ],
  template: `
    <main
      [appPageContext]="{
        label: 'Property reviews',
        skill: 'review-summary',
        facts: data ? 'reviews count=' + data.reviewCount + '; rating average=' + data.rating : '',
        prompts: ['Summarize these reviews', 'Explain this rating sample'],
      }"
      id="main"
      class="container page"
    >
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
  readonly propertyId =
    this.route.snapshot.paramMap.get('propertyId') ?? this.route.snapshot.paramMap.get('id') ?? '';
  data: PropertyReviews | null = null;
  loading = true;
  error = '';
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
}
