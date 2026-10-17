import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api.service';
import { FeedbackComponent } from '../shared/feedback.component';
import {
  EligibleStay,
  Review,
  ReviewApiService,
  Reputation,
  ReviewTag,
} from './review-api.service';
import { ReviewFeedComponent } from './review-feed.component';
import { ReputationComponent } from './reputation.component';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    FeedbackComponent,
    ReviewFeedComponent,
    ReputationComponent,
  ],
  templateUrl: './reviews.component.html',
  styleUrl: './review-ui.css',
})
export class ReviewsComponent implements OnInit {
  private readonly api = inject(ReviewApiService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  readonly host = this.route?.snapshot.data['host'] === true;
  reputation: Reputation | null = null;
  tagOptions: ReviewTag[] = [];
  selectedTags: string[] = [];
  tab: 'received' | 'write' | 'published' = 'received';
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
      [this.stays, this.reviews, this.reputation, this.tagOptions] = await Promise.all([
        this.api.eligible(this.host),
        this.api.mine(),
        this.api.reputation(this.host),
        this.api.tags(),
      ]);
      const reservation = this.route?.snapshot.queryParamMap.get('reservationId');
      const stay = this.stays.find((s) => s.reservationId === reservation);
      const existing = this.reviews.find((r) => r.reservationId === reservation);
      if (!this.message && !this.selected && !this.editing) {
        if (stay) this.start(stay);
        else if (existing) this.edit(existing);
      }
    } catch (e) {
      this.loadError = errorMessage(e);
    } finally {
      this.loading = false;
    }
  }
  start(stay: EligibleStay) {
    this.close();
    this.selected = stay;
    this.tab = 'write';
    this.focusForm();
  }
  edit(review: Review) {
    this.close();
    this.editing = review;
    this.rating = review.rating;
    this.body = review.body;
    this.selectedTags = [...(review.tags || [])];
    this.tab = 'published';
    this.focusForm();
  }
  close() {
    this.selected = null;
    this.editing = null;
    this.rating = 5;
    this.body = '';
    this.saveError = '';
    this.selectedTags = [];
  }
  focusForm() {
    setTimeout(() => document.getElementById('review-form-title')?.focus());
  }
  toggleTag(tag: ReviewTag) {
    if (this.selectedTags.includes(tag.id)) {
      this.selectedTags = this.selectedTags.filter((id) => id !== tag.id);
    } else {
      this.selectedTags = this.selectedTags.filter(
        (id) => this.tagOptions.find((t) => t.id === id)?.category !== tag.category,
      );
      this.selectedTags.push(tag.id);
    }
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
      if (this.editing)
        await this.api.update(
          this.editing.id,
          this.rating,
          this.body.trim(),
          this.host ? [] : this.selectedTags,
        );
      else if (this.selected)
        await this.api.create(
          this.selected.reservationId,
          this.rating,
          this.body.trim(),
          this.host ? [] : this.selectedTags,
          this.host,
        );
      this.close();
      this.message = 'Your review is published. Thank you for sharing your experience.';
      this.tab = 'published';
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
