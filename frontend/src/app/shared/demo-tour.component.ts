import { Component, EventEmitter, HostListener, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { IdentityService } from '../accounts/identity.service';
import { ReservationApiService } from '../reservations/reservation-api.service';
import { MessagingApiService } from '../messages/messaging-api.service';
import { IconComponent } from './icon.component';

interface DemoStep {
  title: string;
  detail: string;
  route: string;
  ai?: boolean;
}
@Component({
  selector: 'app-demo-tour',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (identity.demoEnabled()) {
      <div class="demo-dock">
        @if (menu) {
          <section class="demo-menu panel" id="demo-members" aria-label="Team demonstrations">
            <h2>Meet the team</h2>
            <p class="muted text-sm">Choose a member to present their module and AI integration.</p>
            @for (member of members; track member.name) {
              <button (click)="start(member.name)" [disabled]="busy">
                <strong>{{ member.name }}</strong
                ><small>{{ member.module }}</small>
              </button>
            }
          </section>
        }
        @if (steps.length && !menu) {
          <section class="demo-progress panel" aria-label="Guided demonstration">
            <div class="flex justify-between items-center">
              <span class="eyebrow">{{ member }} · {{ index + 1 }} / {{ steps.length }}</span
              ><button class="icon-button" aria-label="End demo" (click)="end()">
                <app-icon name="close" />
              </button>
            </div>
            <h2>{{ steps[index].title }}</h2>
            <p class="text-sm muted" aria-live="polite">{{ steps[index].detail }}</p>
            <div class="demo-arrows">
              <button
                class="btn secondary"
                aria-label="Previous demo step"
                [disabled]="busy || index === 0"
                (click)="go(index - 1)"
              >
                ← Previous</button
              ><button
                class="btn"
                [disabled]="busy"
                (click)="index === steps.length - 1 ? end() : go(index + 1)"
              >
                {{ index === steps.length - 1 ? 'Finish ✓' : 'Next →' }}
              </button>
            </div>
          </section>
        }
        @if (error) {
          <p class="panel error-text" role="alert">{{ error }}</p>
        }
        <button
          class="demo-toggle"
          (click)="toggleMenu()"
          aria-label="Team demo menu"
          [attr.aria-expanded]="menu"
          aria-controls="demo-members"
        >
          <app-icon name="menu" /><span>Team demos</span>
        </button>
      </div>
    }
  `,
})
export class DemoTourComponent {
  readonly identity = inject(IdentityService);
  private readonly api = inject(ApiService);
  private readonly trips = inject(ReservationApiService);
  private readonly messages = inject(MessagingApiService);
  private readonly router = inject(Router);
  @Output() assistantRequested = new EventEmitter<void>();
  readonly members = [
    { name: 'Aymen Hmani', module: 'Properties, discovery & AI descriptions' },
    { name: 'Hadir Ghallabi', module: 'Reservations, payments & AI itineraries' },
    { name: 'Rania Regai', module: 'Calendar, pricing & AI host insights' },
    { name: 'Wassim Hamouda', module: 'Two-way reviews & AI summaries' },
    { name: 'Kawther Lahneynè', module: 'Conversations & AI message drafts' },
  ];
  menu = false;
  busy = false;
  error = '';
  member = '';
  steps: DemoStep[] = [];
  index = 0;
  @HostListener('document:keydown.escape') closeMenu() {
    this.menu = false;
  }
  toggleMenu() {
    this.menu = !this.menu;
    if (this.menu) {
      setTimeout(() => document.querySelector<HTMLButtonElement>('#demo-members button')?.focus());
    }
  }
  end() {
    this.steps = [];
    this.member = '';
  }
  async start(name: string) {
    if (this.busy) return;
    this.error = '';
    this.busy = true;
    try {
      // A signed-in account takes precedence over demo identities on the server.
      if (this.identity.account()) await this.identity.signOut();
      this.member = name;
      if (name.startsWith('Aymen')) {
        this.identity.select('host');
        const listings = await this.api.hostListings();
        const listing = listings.find((p) => p.status === 'PUBLISHED');
        const editor = listing ? `/host/listings/${listing.id}/edit` : '/host/listings/new';
        this.steps = [
          {
            title: 'Discover a stay',
            detail: 'Search destinations, filter stays and inspect property details.',
            route: '/explore',
          },
          {
            title: 'Save a favourite',
            detail: 'Use the heart on a property, then show persisted wishlists.',
            route: '/wishlists',
          },
          {
            title: 'Manage properties',
            detail: 'Create, publish, edit and archive listings backed by PostgreSQL.',
            route: '/host/listings',
          },
          {
            title: 'AI listing description',
            detail:
              'Review the existing property facts, generate a description and apply the draft explicitly.',
            route: editor,
            ai: true,
          },
        ];
      } else if (name.startsWith('Hadir')) {
        this.identity.select('guest');
        const trips = await this.trips.trips();
        const trip = trips.find((t) => t.status === 'CONFIRMED') || trips[0];
        this.steps = [
          {
            title: 'Choose a stay',
            detail: 'Open a property and choose dates to see the authoritative booking quote.',
            route: '/explore',
          },
          {
            title: 'Persisted trips & receipts',
            detail:
              'Open a trip to show its status, price breakdown and simulated payment receipt.',
            route: '/trips',
          },
          {
            title: 'AI stay itinerary',
            detail:
              'Generate a plan using the selected trip’s real destination, dates and party size.',
            route: trip ? `/trips/${trip.id}` : '/trips',
            ai: !!trip,
          },
          {
            title: 'Host decisions',
            detail: 'Accept or decline pending requests and see the reservation status persist.',
            route: '/host/reservations',
          },
        ];
      } else if (name.startsWith('Rania')) {
        this.steps = [
          {
            title: 'Host operations',
            detail:
              'Show occupancy, confirmed nights, owner blocks and simulated payouts from stored reservations.',
            route: '/host/today',
          },
          {
            title: 'Availability & nightly prices',
            detail:
              'Select a property and date. Show owner blocks and date-specific nightly overrides.',
            route: '/host/calendar',
          },
          {
            title: 'AI calendar insights',
            detail:
              'Use “Explain this calendar” for the selected property and month, or the assistant’s suggested actions.',
            route: '/host/calendar',
            ai: true,
          },
          {
            title: 'AI performance summary',
            detail: 'Generate host insights from the dashboard’s actual aggregate metrics.',
            route: '/host/today',
            ai: true,
          },
        ];
      } else if (name.startsWith('Wassim')) {
        this.steps = [
          {
            title: 'Visitor reviews',
            detail:
              'Show received feedback, eligible stays and reviews you wrote. Ratings and tags persist.',
            route: '/reviews',
          },
          {
            title: 'AI visitor review summary',
            detail:
              'Use the visible AI summary beside the visitor’s rating; it uses the reviews shown here.',
            route: '/reviews',
            ai: true,
          },
          {
            title: 'Host reviews',
            detail:
              'Show guest feedback, host reputation and the host’s reviews of completed visitors.',
            route: '/host/reviews',
          },
          {
            title: 'AI host review summary',
            detail: 'Summarize the host’s rating snapshot from the same review section.',
            route: '/host/reviews',
            ai: true,
          },
        ];
      } else {
        this.identity.select('guest');
        const inbox = await this.messages.inbox();
        const thread = inbox[0];
        this.steps = [
          {
            title: 'Guest conversations',
            detail:
              'Open an inquiry or reservation thread; demonstrate replies, read state and editing your messages.',
            route: thread ? `/messages/threads/${thread.id}` : '/messages',
          },
          {
            title: 'AI message draft',
            detail:
              'Choose an arrival, checkout or property question. Review the draft before placing it in the composer.',
            route: thread ? `/messages/threads/${thread.id}` : '/messages',
            ai: true,
          },
          {
            title: 'Host inbox',
            detail:
              'Switch to the host’s persisted inbox and show the other side of guest conversations.',
            route: '/host/messages',
          },
        ];
      }
      this.menu = false;
      await this.go(0);
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.busy = false;
    }
  }
  async go(index: number) {
    this.busy = true;
    this.error = '';
    try {
      const step = this.steps[index];
      this.identity.select(step.route.startsWith('/host') ? 'host' : 'guest');
      if (this.router.url !== step.route && !(await this.router.navigateByUrl(step.route))) {
        throw new Error('Navigation failed');
      }
      this.index = index;
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (step.ai) this.assistantRequested.emit();
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.busy = false;
    }
  }
}
