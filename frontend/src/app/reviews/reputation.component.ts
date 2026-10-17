import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Reputation, TagCount } from './review-api.service';

@Component({
  selector: 'app-reputation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="review-metrics">
      <div>
        <p class="score">
          {{ data.reviewCount ? (data.rating | number: '1.1-1') : '—' }} <small>/ 5</small>
        </p>
        <p class="muted">
          {{ data.reviewCount }} {{ data.reviewCount === 1 ? 'review' : 'reviews' }}
        </p>
      </div>
      @if (distribution && data.reviewCount) {
        <div class="rating-bars" aria-label="Rating distribution">
          @for (rating of [5, 4, 3, 2, 1]; track rating) {
            <div class="rating-bar">
              <span>{{ rating }}★</span
              ><progress
                [value]="count(rating)"
                [max]="data.reviewCount"
                [attr.aria-label]="rating + ' stars: ' + count(rating) + ' reviews'"
              ></progress
              ><span>{{ count(rating) }}</span>
            </div>
          }
        </div>
      }
    </div>
    @if (data.tags?.length) {
      <p class="review-context">What guests mention</p>
      <div class="pills">
        @for (tag of data.tags || []; track tag.id) {
          <span class="pill" [class.bad]="tag.sentiment === 'BAD'"
            ><span aria-hidden="true">{{ tag.sentiment === 'GOOD' ? '+' : '−' }}</span
            >{{ tag.label }} <strong>×{{ tag.count }}</strong></span
          >
        }
      </div>
    }
    @if (!data.reviewCount) {
      <p class="muted">Ratings appear after a completed stay is reviewed.</p>
    }
  `,
  styleUrl: './review-ui.css',
})
export class ReputationComponent {
  @Input({ required: true }) data!: Pick<Reputation, 'rating' | 'reviewCount' | 'reviews'> & {
    tags?: TagCount[];
  };
  @Input() distribution = false;
  count(rating: number) {
    return this.data.reviews.filter((r) => r.rating === rating).length;
  }
}
