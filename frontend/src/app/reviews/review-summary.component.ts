import { Component, Input, OnChanges, inject } from '@angular/core';
import { ApiService, errorMessage } from '../core/api.service';
import { AiResponse } from '../core/models';
import { AiMarkdownComponent } from '../shared/ai-markdown.component';

@Component({
  selector: 'app-review-summary',
  standalone: true,
  imports: [AiMarkdownComponent],
  template: `<section class="inset mt-4" aria-label="AI review summary">
    <strong>AI review summary</strong>
    <p class="muted text-sm">
      A quick reading of these ratings. Read the individual reviews for the full story.
    </p>
    <button class="btn secondary small mt-3" [disabled]="busy || !count" (click)="summarize()">
      {{ busy ? 'Summarizing…' : 'Summarize these reviews' }}
    </button>
    @if (!count) {
      <p class="muted text-sm mt-2">A summary becomes available after the first review.</p>
    }
    @if (error) {
      <p class="error-text" role="alert">{{ error }}</p>
    }
    @if (response) {
      <span class="badge mt-3">{{
        response.mode === 'live' ? 'AI model response' : 'Offline response'
      }}</span>
      <app-ai-markdown class="mt-3" [text]="response.text" />
      <p class="muted text-xs">{{ response.notice }} Review before sharing.</p>
    }
  </section>`,
})
export class ReviewSummaryComponent implements OnChanges {
  private readonly api = inject(ApiService);
  @Input() count = 0;
  @Input() rating = 0;
  @Input() scope = '';
  busy = false;
  error = '';
  response: AiResponse | null = null;
  private version = 0;
  ngOnChanges() {
    this.version++;
    this.response = null;
    this.error = '';
    this.busy = false;
  }
  async summarize() {
    if (this.busy || !this.count) return;
    const version = ++this.version;
    this.busy = true;
    this.error = '';
    this.response = null;
    try {
      const response = await this.api.assist(
        'review-summary',
        `reviews count=${this.count}; rating average=${Number(this.rating).toFixed(2)}`,
      );
      if (version === this.version) this.response = response;
    } catch (e) {
      if (version === this.version) this.error = errorMessage(e);
    } finally {
      if (version === this.version) this.busy = false;
    }
  }
}
