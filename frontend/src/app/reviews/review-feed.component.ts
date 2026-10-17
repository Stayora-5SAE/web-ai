import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Review } from './review-api.service';

@Component({
  selector: 'app-review-feed',
  standalone: true,
  imports: [CommonModule],
  template: `
    @for (review of reviews; track review.id) {
      <article class="review-entry">
        <div class="review-author">
          <span class="review-avatar" aria-hidden="true">{{ review.authorName.charAt(0) }}</span>
          <div>
            <strong>{{ review.authorName }}</strong>
            <p class="review-context">
              {{ review.createdAt | date: 'MMM yyyy' }} ·
              {{ review.reservationId ? 'Verified stay' : 'Historical review' }}
            </p>
          </div>
        </div>
        <p class="stars mt-3" [attr.aria-label]="review.rating + ' out of 5 stars'">
          {{ '★'.repeat(review.rating) }}{{ '☆'.repeat(5 - review.rating) }}
        </p>
        <p class="review-text">{{ review.body }}</p>
        <div class="pills">
          @for (tag of review.tagDetails || []; track tag.id) {
            <span class="pill" [class.bad]="tag.sentiment === 'BAD'"
              ><span aria-hidden="true">{{ tag.sentiment === 'GOOD' ? '+' : '−' }}</span
              >{{ tag.label }}</span
            >
          }
        </div>
        @if (context) {
          <p class="review-context mt-3">{{ review.propertyTitle }}</p>
        }
      </article>
    }
  `,
  styleUrl: './review-ui.css',
})
export class ReviewFeedComponent {
  @Input() reviews: Review[] = [];
  @Input() context = false;
}
