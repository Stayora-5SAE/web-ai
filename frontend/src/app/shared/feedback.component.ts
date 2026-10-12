import { Component, EventEmitter, Input, Output } from '@angular/core';
@Component({
  selector: 'app-feedback',
  standalone: true,
  template: `
    @if (loading) {
      <div class="feedback" role="status">
        <span class="spinner"></span> Preparing your Stayora experience…
      </div>
    }
    @if (error) {
      <div class="feedback error" role="alert">
        <p>{{ error }}</p>
        <button class="btn secondary" (click)="retry.emit()">Try again</button>
      </div>
    }
  `,
  styles: [':host{display:block}'],
})
export class FeedbackComponent {
  @Input() loading = false;
  @Input() error = '';
  @Output() retry = new EventEmitter<void>();
}
