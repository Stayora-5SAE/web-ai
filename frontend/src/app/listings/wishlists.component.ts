import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../core/api.service';
import { FeedbackComponent } from '../shared/feedback.component';
import { PropertyCardComponent } from '../shared/property-card.component';
import { WishlistService } from './wishlist.service';

@Component({
  selector: 'app-wishlists',
  standalone: true,
  imports: [RouterLink, FeedbackComponent, PropertyCardComponent],
  template: `<main id="main" class="container page">
    <div class="page-intro">
      <div>
        <h1>Your saved spaces</h1>
        <p class="muted">A little collection of places you would love to call home.</p>
      </div>
      <a class="btn secondary" routerLink="/explore">Explore stays</a>
    </div>
    <app-feedback [loading]="loading" [error]="error" (retry)="load()" />
    @if (!loading && !error) {
      <section
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        aria-label="Saved properties"
      >
        @for (property of wishlists.properties(); track property.id) {
          <app-property-card [property]="property" />
        } @empty {
          <p class="empty md:col-span-2 lg:col-span-3">
            Your wishlist is waiting for inspiration. Save a stay with its heart button.
          </p>
        }
      </section>
    }
  </main>`,
})
export class WishlistsComponent implements OnInit {
  readonly wishlists = inject(WishlistService);
  loading = true;
  error = '';
  ngOnInit() {
    void this.load();
  }
  async load() {
    this.loading = true;
    this.error = '';
    try {
      await this.wishlists.load();
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.loading = false;
    }
  }
}
