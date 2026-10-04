import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService, errorMessage } from '../core/api.service';
import { Property } from '../core/models';
import { SelectionService } from '../core/selection.service';
import { FeedbackComponent } from '../shared/feedback.component';
import { SearchBarComponent } from '../shared/search-bar.component';
import { PropertyCardComponent } from '../shared/property-card.component';
import { MapComponent } from './map.component';
@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FeedbackComponent, SearchBarComponent, PropertyCardComponent, MapComponent],
  template: ` <main id="main">
    <div class="search-controls">
      <app-search-bar />
      <div class="category-row">
        <button class="chip" [class.active]="!selection.category" (click)="filter('')">
          All stays
        </button>
        @for (category of categories; track category) {
          <button
            class="chip"
            [class.active]="selection.category === category"
            (click)="filter(category)"
          >
            {{ category }}
          </button>
        }
      </div>
    </div>
    <div class="results-info">
      {{ properties.length }} stays found{{
        selection.destination ? ' in ' + selection.destination : ''
      }}
      · {{ selection.nights }} nights · Prices include all booking fees
    </div>
    <app-feedback [loading]="loading" [error]="error" (retry)="load()" />
    @if (!loading && !error) {
      <div class="search-split">
        <section class="result-list" aria-label="Search results">
          @for (property of properties; track property.id) {
            <div [class.selected-card]="selected === property.id">
              <app-property-card [property]="property" [horizontal]="true" />
            </div>
          } @empty {
            <p class="empty">
              No stays match these dates and filters. Try another destination or date range.
            </p>
          }
          <div class="inset">
            <h3>The Stayora Transparent Rate Commitment</h3>
            <p class="muted mt-2">
              Every total includes the nightly rate, cleaning fee, and Stayora service fee. No
              surprises at checkout.
            </p>
          </div>
        </section>
        <app-map
          [properties]="properties"
          [selected]="selected"
          (selectProperty)="selected = $event"
          (openProperty)="open($event)"
        />
      </div>
    }
  </main>`,
})
export class SearchComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly selection = inject(SelectionService);
  categories = ['Apartments', 'Houses', 'Guesthouses / Dars', 'Coastal Escapes'];
  properties: Property[] = [];
  loading = true;
  error = '';
  selected = '';
  private requestVersion = 0;
  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      this.selection.restore(params);
      void this.load();
    });
  }
  filter(category: string) {
    this.selection.category = category;
    void this.router.navigate(['/search'], { queryParams: this.selection.params() });
  }
  open(id: string) {
    void this.router.navigate(['/properties', id], { queryParams: this.selection.params() });
  }
  async load() {
    const version = ++this.requestVersion;
    this.loading = true;
    this.error = '';
    try {
      const properties = await this.api.properties(this.selection.params());
      if (version === this.requestVersion) this.properties = properties;
    } catch (e) {
      if (version === this.requestVersion) this.error = errorMessage(e);
    } finally {
      if (version === this.requestVersion) this.loading = false;
    }
  }
}
