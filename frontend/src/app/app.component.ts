import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, errorMessage } from './core/api.service';
import { IdentityService } from './accounts/identity.service';
import { IconComponent } from './shared/icon.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, IconComponent],
  template: `
    <a class="skip-link" href="#main">Skip to content</a><router-outlet />
    <button
      class="assistant-toggle"
      (click)="open = !open"
      [attr.aria-expanded]="open"
      aria-controls="assistant-panel"
    >
      <app-icon name="message" /> Demo AI
    </button>
    @if (open) {
      <section class="assistant-panel panel" id="assistant-panel" aria-label="Mock AI assistant">
        <div class="flex justify-between items-center">
          <h2>Stayora assistant</h2>
          <button class="icon-button" (click)="open = false" aria-label="Close assistant">
            <app-icon name="close" />
          </button>
        </div>
        <span class="badge">Mock responses · no external provider</span>
        <form (ngSubmit)="ask()">
          <label for="ai-context">{{
            identity.mode() === 'host'
              ? 'What should your host summary focus on?'
              : 'Where is your stay located?'
          }}</label
          ><input
            id="ai-context"
            name="context"
            [(ngModel)]="context"
            maxlength="300"
            required
          /><button class="btn" [disabled]="busy || !context.trim()">
            {{ busy ? 'Preparing…' : 'Generate demo response' }}
          </button>
        </form>
        <p aria-live="polite">{{ answer }}</p>
      </section>
    }
  `,
})
export class AppComponent {
  readonly identity = inject(IdentityService);
  private readonly api = inject(ApiService);
  open = false;
  busy = false;
  context = 'La Marsa, Tunis';
  answer = '';
  async ask() {
    this.busy = true;
    try {
      this.answer = (
        await this.api.assist(
          this.identity.mode() === 'host' ? 'host-summary' : 'listing-description',
          this.context,
        )
      ).text;
    } catch (e) {
      this.answer = errorMessage(e);
    } finally {
      this.busy = false;
    }
  }
}
