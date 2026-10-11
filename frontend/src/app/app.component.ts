import { Component, OnInit, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, errorMessage } from './core/api.service';
import { IdentityService } from './accounts/identity.service';
import { IconComponent } from './shared/icon.component';
import { AiResponse, AiSkill } from './core/models';
import { WishlistService } from './listings/wishlist.service';
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
      <app-icon name="message" /> AI assistant
    </button>
    @if (open) {
      <section class="assistant-panel panel" id="assistant-panel" aria-label="AI assistant">
        <div class="flex justify-between items-center">
          <h2>Stayora assistant</h2>
          <button class="icon-button" (click)="open = false" aria-label="Close assistant">
            <app-icon name="close" />
          </button>
        </div>
        <span class="badge">{{
          response?.mode === 'live' ? 'Provider draft' : 'Offline demonstration'
        }}</span>
        <p class="text-xs muted">
          Use public property facts or anonymous counts. Personal names, contact details, and
          private conversation text are excluded from outbound context.
        </p>
        <form (ngSubmit)="ask()">
          <label for="ai-skill">How can we help?</label>
          <select id="ai-skill" name="skill" [(ngModel)]="skill">
            @for (option of skills; track option.id) {
              <option [value]="option.id">{{ option.label }}</option>
            }
          </select>
          <label for="ai-context">Destination, preferences, or anonymous metrics</label
          ><textarea
            id="ai-context"
            name="context"
            [(ngModel)]="context"
            maxlength="2000"
            required
          ></textarea
          ><button class="btn" [disabled]="busy || !context.trim() || !skills.length">
            {{ busy ? 'Preparing…' : 'Generate suggestion' }}
          </button>
        </form>
        @if (skillsError) {
          <p role="alert" class="error-text">{{ skillsError }}</p>
          <button class="btn secondary small" (click)="loadSkills()">Retry assistant</button>
        }
        @if (response?.notice) {
          <p class="text-xs muted">{{ response?.notice }}</p>
        }
        <p aria-live="polite">{{ answer }}</p>
        @if (response) {
          <p class="text-xs muted">
            Review this draft before using it. No action has been performed.
          </p>
        }
      </section>
    }
  `,
})
export class AppComponent implements OnInit {
  readonly identity = inject(IdentityService);
  private readonly api = inject(ApiService);
  private readonly wishlists = inject(WishlistService);
  open = false;
  busy = false;
  context = 'La Marsa, Tunis';
  answer = '';
  skill = 'listing-description';
  skills: AiSkill[] = [];
  skillsError = '';
  response: AiResponse | null = null;
  constructor() {
    effect(
      () => {
        this.identity.revision();
        const guest =
          this.identity.account()?.role === 'GUEST' ||
          (!this.identity.account() &&
            this.identity.mode() === 'guest' &&
            this.identity.demoEnabled());
        this.wishlists.reset();
        if (guest) void this.wishlists.load().catch(() => undefined);
      },
      { allowSignalWrites: true },
    );
  }
  ngOnInit() {
    void this.loadSkills();
  }
  async loadSkills() {
    this.skillsError = '';
    try {
      this.skills = await this.api.skills();
    } catch (e) {
      this.skillsError = errorMessage(e);
    }
  }
  async ask() {
    this.busy = true;
    this.response = null;
    try {
      this.response = await this.api.assist(this.skill, this.context);
      this.answer = this.response.text;
    } catch (e) {
      this.answer = errorMessage(e);
    } finally {
      this.busy = false;
    }
  }
}
