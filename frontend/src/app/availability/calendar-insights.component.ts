import { Component, Input, OnChanges, inject } from '@angular/core';
import { ApiService, errorMessage } from '../core/api.service';
import { AiResponse } from '../core/models';
import { AiMarkdownComponent } from '../shared/ai-markdown.component';
@Component({
  selector: 'app-calendar-insights',
  standalone: true,
  imports: [AiMarkdownComponent],
  template: `<section class="panel mb-6" aria-label="AI calendar insights">
    <span class="eyebrow">Rania’s AI integration</span>
    <h2 class="mt-2">Make sense of this calendar</h2>
    <p class="muted mt-2">
      {{ propertyTitle }} · {{ month }}. Explain booked nights, owner blocks and availability before
      deciding what to change.
    </p>
    <button class="btn secondary mt-3" [disabled]="busy || !facts" (click)="generate()">
      {{ busy ? 'Reading calendar…' : 'Explain this calendar' }}
    </button>
    @if (error) {
      <p role="alert" class="error-text">{{ error }}</p>
    }
    @if (response) {
      <span class="badge mt-3">{{
        response.mode === 'live' ? 'AI model response' : 'Offline response'
      }}</span>
      <app-ai-markdown class="mt-3" [text]="response.text" />
      <p class="text-xs muted">
        {{ response.notice }} Review suggestions before changing dates or prices.
      </p>
    }
  </section>`,
})
export class CalendarInsightsComponent implements OnChanges {
  private readonly api = inject(ApiService);
  @Input() facts = '';
  @Input() propertyTitle = '';
  @Input() month = '';
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
  async generate() {
    if (!this.facts || this.busy) return;
    const version = ++this.version;
    this.busy = true;
    this.error = '';
    try {
      const response = await this.api.assist('host-summary', this.facts);
      if (version === this.version) this.response = response;
    } catch (e) {
      if (version === this.version) this.error = errorMessage(e);
    } finally {
      if (version === this.version) this.busy = false;
    }
  }
}
