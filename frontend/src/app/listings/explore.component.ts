import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { Property } from '../core/models';
import { SelectionService } from '../core/selection.service';
import { FeedbackComponent } from '../shared/feedback.component';
import { PropertyCardComponent } from '../shared/property-card.component';
import { SearchBarComponent } from '../shared/search-bar.component';
@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [RouterLink, FeedbackComponent, PropertyCardComponent, SearchBarComponent],
  template: ` <main id="main" class="explore">
    <div class="container page">
      <div class="explore-intro">
        <h1>Find a place to feel at home.</h1>
        <p>
          Handpicked sanctuaries and authentic stays across the Mediterranean and Tunisian coast.
        </p>
      </div>
      <app-search-bar />
      <div class="category-row" aria-label="Property categories">
        @for (category of categories; track category) {
          <button
            class="chip"
            [class.active]="selection.category === category"
            [attr.aria-pressed]="selection.category === category"
            (click)="filter(category)"
          >
            {{ category }}
          </button>
        }
      </div>
      <app-feedback [loading]="loading" [error]="error" (retry)="load()" />
      @if (!loading && !error) {
        @if (properties.length === 0) {
          <p class="empty">No stays in this category yet. Try another category.</p>
        }
        <section>
          <div class="section-title">
            <div>
              <h2>Places for your next break</h2>
              <p>Handpicked homes with verified amenities</p>
            </div>
            <a routerLink="/search" [queryParams]="selection.params()">Show all →</a>
          </div>
          <div class="properties-grid">
            @for (property of properties.slice(0, 3); track property.id) {
              <app-property-card [property]="property" />
            }
          </div>
        </section>
        @if (properties.length > 3) {
          <section class="mt-14">
            <div class="section-title">
              <div>
                <h2>Explore nearby coastal retreats</h2>
                <p>Calm weekend getaways within two hours of Tunis</p>
              </div>
              <a routerLink="/search" [queryParams]="selection.params()">See more retreats →</a>
            </div>
            <div class="properties-grid">
              @for (property of properties.slice(3); track property.id) {
                <app-property-card [property]="property" />
              }
            </div>
          </section>
        }
      }
    </div>
  </main>`,
})
export class ExploreComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly selection = inject(SelectionService);
  readonly categories = [
    'Apartments',
    'Houses',
    'Guesthouses / Dars',
    'Coastal Escapes',
    'Countryside Retreats',
  ];
  properties: Property[] = [];
  loading = true;
  error = '';
  ngOnInit() {
    void this.load();
  }
  filter(category: string) {
    this.selection.category = this.selection.category === category ? '' : category;
    void this.load();
  }
  async load() {
    this.loading = true;
    this.error = '';
    try {
      this.properties = (await this.api.properties({ category: this.selection.category }))
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, 6);
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.loading = false;
    }
  }
}
