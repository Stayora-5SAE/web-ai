import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../core/api.service';
import { FeedbackComponent } from '../shared/feedback.component';
import { EligibleStay, Review, ReviewApiService } from './review-api.service';

export const REVIEW_STYLES = `
  .review-shell{padding-top:36px;padding-bottom:72px;max-width:1120px}
  h1{font-family:'Noto Serif',Georgia,serif;font-size:clamp(28px,4vw,42px);margin:20px 0 12px}h2{margin:32px 0 20px}
  .review-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:20px}
  .review-card,.review-form{border:1px solid #dce6e0;border-radius:20px;padding:24px;background:white;min-width:0}
  .published{margin-bottom:18px}.stay-image{width:100%;height:180px;object-fit:cover;border-radius:12px}
  .actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.review-form{margin-top:28px;background:#f4faf7}
  textarea{display:block;width:100%;padding:14px;border:1px solid #bdcbc4;border-radius:12px;margin-top:8px;resize:vertical;font:inherit;box-sizing:border-box}
  fieldset{border:0;padding:0;margin:20px 0}.star-picker{display:flex;gap:12px;margin-top:10px}
  .star-picker label{font-size:32px;color:#aab8b0;display:flex;align-items:center;gap:4px;cursor:pointer}.star-picker label.selected,.stars{color:#b07913}
  .star-picker input{width:16px;height:16px;accent-color:#17634d}.stars{font-size:22px;letter-spacing:3px}
  .error-text{color:#a9342f}.empty,.notice{padding:20px;background:#f1f7f3;border-radius:14px}.notice{border:1px solid #b4d9c3}
  p{overflow-wrap:anywhere}.review-card p{line-height:1.7;white-space:pre-wrap}
  @media(max-width:540px){.review-card,.review-form{padding:18px}.star-picker{gap:5px}.star-picker label{font-size:26px}.review-shell{padding-top:24px}}
`;

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FeedbackComponent],
  template: `
    <main class="shell review-shell">
      <a routerLink="/trips" class="muted">← Your trips</a>
      <h1>Your stories, their next stay.</h1>
      <p class="muted">Share an honest review after your confirmed stay has ended.</p>
      <app-feedback [loading]="loading" [error]="loadError" (retry)="load()" />
      @if (message) {
        <p class="notice" role="status">{{ message }}</p>
      }
      @if (!loading && !loadError) {
        <h2>Stays ready to review</h2>
        @if (stays.length === 0) {
          <p class="empty">
            No stays are ready yet. Reviews open on the check-out date of a confirmed stay.
          </p>
        }
        <div class="review-grid">
          @for (stay of stays; track stay.reservationId) {
            <article class="review-card">
              <img [src]="stay.image" [alt]="stay.propertyTitle" class="stay-image" />
              <h3>{{ stay.propertyTitle }}</h3>
              <p class="muted">{{ stay.checkIn | date }} – {{ stay.checkOut | date }}</p>
              <button class="btn" (click)="start(stay)">Write a review</button>
            </article>
          }
        </div>
        @if (selected || editing) {
          <form class="review-form" (ngSubmit)="save()">
            <h2>{{ editing ? 'Edit your review' : 'How was your stay?' }}</h2>
            @if (selected) {
              <p>{{ selected.propertyTitle }}</p>
            }
            <fieldset>
              <legend>Overall rating</legend>
              <div class="star-picker">
                @for (star of [1, 2, 3, 4, 5]; track star) {
                  <label [class.selected]="rating >= star">
                    <input
                      type="radio"
                      name="rating"
                      [value]="star"
                      [(ngModel)]="rating"
                      required
                      [attr.aria-label]="star + ' stars'"
                    />
                    <span aria-hidden="true">★</span>
                  </label>
                }
              </div>
            </fieldset>
            <label for="review-body">Your experience</label>
            <textarea
              id="review-body"
              name="body"
              [(ngModel)]="body"
              minlength="10"
              maxlength="2000"
              required
              rows="5"
              placeholder="What should future guests know about the stay?"
            ></textarea>
            <p class="muted">
              {{ body.length }}/2,000 characters. Keep private contact details out of your review.
            </p>
            @if (saveError) {
              <p class="error-text" role="alert">{{ saveError }}</p>
            }
            <div class="actions">
              <button class="btn" type="submit" [disabled]="saving">
                {{ saving ? 'Saving…' : 'Save review' }}
              </button>
              <button class="btn secondary" type="button" [disabled]="saving" (click)="close()">
                Cancel
              </button>
            </div>
          </form>
        }
        <h2>Your published reviews</h2>
        @if (reviews.length === 0) {
          <p class="empty">Your reviews will appear here after you publish them.</p>
        }
        @for (review of reviews; track review.id) {
          <article class="review-card published">
            <p class="stars" [attr.aria-label]="review.rating + ' out of 5 stars'">
              {{ stars(review.rating) }}
            </p>
            <p>{{ review.body }}</p>
            <p class="muted">Published {{ review.createdAt | date }}</p>
            <div class="actions">
              <a [routerLink]="['/properties', review.propertyId, 'reviews']"
                >View property reviews</a
              >
              <button class="btn secondary" (click)="edit(review)" [disabled]="saving">Edit</button>
              <button class="btn secondary" (click)="deleteTarget = review.id" [disabled]="saving">
                Delete
              </button>
            </div>
            @if (deleteTarget === review.id) {
              <p>Delete this review? The property rating will be recalculated.</p>
              <div class="actions">
                <button class="btn" (click)="remove(review)" [disabled]="saving">
                  Confirm deletion
                </button>
                <button class="btn secondary" (click)="deleteTarget = ''" [disabled]="saving">
                  Keep review
                </button>
              </div>
            }
          </article>
        }
        @if (deleteError) {
          <p class="error-text" role="alert">{{ deleteError }}</p>
        }
      }
    </main>
  `,
  styles: [REVIEW_STYLES],
})
export class ReviewsComponent implements OnInit {
  private readonly api = inject(ReviewApiService);
  stays: EligibleStay[] = [];
  reviews: Review[] = [];
  loading = true;
  loadError = '';
  saveError = '';
  deleteError = '';
  message = '';
  selected: EligibleStay | null = null;
  editing: Review | null = null;
  rating = 5;
  body = '';
  saving = false;
  deleteTarget = '';
  ngOnInit() {
    void this.load();
  }
  async load() {
    this.loading = true;
    this.loadError = '';
    try {
      [this.stays, this.reviews] = await Promise.all([this.api.eligible(), this.api.mine()]);
    } catch (e) {
      this.loadError = errorMessage(e);
    } finally {
      this.loading = false;
    }
  }
  start(stay: EligibleStay) {
    this.close();
    this.selected = stay;
  }
  edit(review: Review) {
    this.close();
    this.editing = review;
    this.rating = review.rating;
    this.body = review.body;
  }
  close() {
    this.selected = null;
    this.editing = null;
    this.rating = 5;
    this.body = '';
    this.saveError = '';
  }
  stars(rating: number) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }
  async save() {
    if (this.saving) return;
    if (
      this.body.trim().length < 10 ||
      this.body.trim().length > 2000 ||
      !Number.isInteger(this.rating) ||
      this.rating < 1 ||
      this.rating > 5
    ) {
      this.saveError = 'Choose 1–5 stars and write 10–2,000 characters.';
      return;
    }
    if (!this.selected && !this.editing) return;
    this.saving = true;
    this.saveError = '';
    this.message = '';
    try {
      if (this.editing) await this.api.update(this.editing.id, this.rating, this.body.trim());
      else if (this.selected)
        await this.api.create(this.selected.reservationId, this.rating, this.body.trim());
      this.close();
      this.message = 'Your review is saved. Thank you for helping future guests.';
      await this.load();
    } catch (e) {
      this.saveError = errorMessage(e);
    } finally {
      this.saving = false;
    }
  }
  async remove(review: Review) {
    if (this.saving) return;
    this.saving = true;
    this.deleteError = '';
    this.message = '';
    try {
      await this.api.delete(review.id);
      this.deleteTarget = '';
      if (this.editing?.id === review.id) this.close();
      this.message = 'Your review has been deleted.';
      await this.load();
    } catch (e) {
      this.deleteError = errorMessage(e);
    } finally {
      this.saving = false;
    }
  }
}
