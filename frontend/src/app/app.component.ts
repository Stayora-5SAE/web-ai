import { Component, HostListener, effect, inject } from '@angular/core';
import { NavigationStart, Router, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, errorMessage } from './core/api.service';
import { IdentityService } from './accounts/identity.service';
import { IconComponent } from './shared/icon.component';
import { AiResponse } from './core/models';
import { WishlistService } from './listings/wishlist.service';
import { AiMarkdownComponent } from './shared/ai-markdown.component';
import { PageContextService } from './shared/page-context.directive';
import { DemoTourComponent } from './shared/demo-tour.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, IconComponent, AiMarkdownComponent, DemoTourComponent],
  template: `
    <a class="skip-link" href="#main">Skip to content</a><router-outlet />
    <app-demo-tour (assistantRequested)="showAssistant()" />
    <button
      class="assistant-toggle"
      aria-label="Help with this page"
      (click)="open = !open"
      [attr.aria-expanded]="open"
      aria-controls="assistant-panel"
    >
      <app-icon name="message" /><span class="assistant-toggle-label">Help with this page</span>
    </button>
    @if (open) {
      <section class="assistant-panel panel" id="assistant-panel" aria-label="Page assistant">
        <div class="flex justify-between items-center">
          <h2>Your page assistant</h2>
          <button class="icon-button" (click)="open = false" aria-label="Close assistant">
            <app-icon name="close" />
          </button>
        </div>
        <span class="badge mt-3">{{ page?.label || 'Explore Stayora' }}</span>
        <p class="muted mt-3">
          {{
            page
              ? 'I use the current page’s property facts and anonymous statistics. Choose a suggestion to get started.'
              : 'Open a property, trip, calendar, review section or conversation for help tailored to that page.'
          }}
        </p>
        @if (page; as current) {
          <div class="assistant-prompts">
            @for (prompt of current.prompts; track prompt) {
              <button
                class="btn secondary small"
                [disabled]="busy || !current.facts"
                (click)="ask(prompt)"
              >
                {{ prompt }}
              </button>
            }
          </div>
          <form (ngSubmit)="ask(question)">
            <label for="ai-question">Anything else about this page?</label>
            <textarea
              id="ai-question"
              name="question"
              [(ngModel)]="question"
              maxlength="500"
              placeholder="For example: explain occupancy or prepare an arrival message"
            ></textarea>
            <button class="btn" [disabled]="busy || !current.facts">
              {{ busy ? 'Preparing…' : 'Help me with this page' }}
            </button>
          </form>
          <details class="text-xs muted">
            <summary>Page facts used</summary>
            <p>{{ current.facts || 'Waiting for this page to load…' }}</p>
          </details>
        }
        @if (busy) {
          <p role="status" class="muted mt-3">Preparing a suggestion for {{ answerPage }}…</p>
        }
        @if (error) {
          <p role="alert" class="error-text">{{ error }}</p>
        }
        @if (response) {
          <p class="text-xs muted mt-3">
            {{ answerPage }} ·
            {{ response.mode === 'live' ? 'AI model response' : 'Offline response' }}
          </p>
          <app-ai-markdown class="mt-3" [text]="response.text" />
          <p class="text-xs muted">{{ response.notice }}</p>
          <p class="text-xs muted">
            Review the suggestion before using it. Apply changes or send drafts on the page.
          </p>
        }
      </section>
    }
  `,
})
export class AppComponent {
  readonly identity = inject(IdentityService);
  private readonly api = inject(ApiService);
  private readonly wishlists = inject(WishlistService);
  private readonly context = inject(PageContextService);
  private readonly router = inject(Router);
  open = false;
  busy = false;
  question = '';
  error = '';
  answerPage = '';
  response: AiResponse | null = null;
  private request = 0;
  get page() {
    return this.context.current;
  }
  constructor() {
    this.context.changes.subscribe(() => {
      this.request++;
      this.response = null;
      this.error = '';
      this.question = '';
      this.busy = false;
    });
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.request++;
        this.response = null;
        this.error = '';
        this.question = '';
        this.busy = false;
      }
    });
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
  @HostListener('document:keydown.escape') close() {
    this.open = false;
  }
  showAssistant() {
    this.open = true;
    this.response = null;
    this.error = '';
  }
  async ask(question: string) {
    const page = this.page;
    if (!page?.facts || this.busy) return;
    const request = ++this.request;
    this.busy = true;
    this.response = null;
    this.error = '';
    this.answerPage = page.label;
    try {
      const response = await this.api.assist(
        page.skill,
        `${page.facts}; question=${question || page.prompts[0]}`,
      );
      if (request === this.request && this.page?.facts === page.facts) this.response = response;
    } catch (e) {
      if (request === this.request) this.error = errorMessage(e);
    } finally {
      if (request === this.request) this.busy = false;
    }
  }
}
