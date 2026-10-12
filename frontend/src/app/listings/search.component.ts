import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
  imports: [
    FormsModule,
    FeedbackComponent,
    SearchBarComponent,
    PropertyCardComponent,
    MapComponent,
  ],
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
    <form class="container flex flex-wrap items-end gap-3 pb-4" (ngSubmit)="applyPrices()">
      <label
        >Minimum nightly price (TND)<input
          type="number"
          name="minPrice"
          min="0"
          step="0.001"
          [(ngModel)]="minPrice"
      /></label>
      <label
        >Maximum nightly price (TND)<input
          type="number"
          name="maxPrice"
          min="0"
          step="0.001"
          [(ngModel)]="maxPrice"
      /></label>
      <button class="btn secondary small" type="submit">Apply price range</button>
      <button class="btn secondary small" type="button" (click)="clearPrices()">Clear</button>
    </form>
    <div class="results-info">
      {{ properties.length }} stays found{{
        selection.destination ? ' in ' + selection.destination : ''
      }}
      · {{ selection.nights }} nights · Check each stay's quote for date-specific prices and fees
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
  minPrice: number | null = null;
  maxPrice: number | null = null;
  private requestVersion = 0;
  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      this.selection.restore(params);
      this.minPrice = params.has('minPrice') ? Number(params.get('minPrice')) : null;
      this.maxPrice = params.has('maxPrice') ? Number(params.get('maxPrice')) : null;
      void this.load();
    });
  }
  filter(category: string) {
    this.selection.category = category;
    void this.router.navigate(['/search'], { queryParams: this.priceParams() });
  }
  open(id: string) {
    void this.router.navigate(['/properties', id], { queryParams: this.selection.params() });
  }
  async load() {
    const version = ++this.requestVersion;
    this.loading = true;
    this.error = '';
    try {
      const properties = await this.api.properties(this.priceParams());
      if (version === this.requestVersion) this.properties = properties;
    } catch (e) {
      if (version === this.requestVersion) this.error = errorMessage(e);
    } finally {
      if (version === this.requestVersion) this.loading = false;
    }
  }
  priceParams(): Record<string, string | number> {
    const params: Record<string, string | number> = { ...this.selection.params() };
    if (this.minPrice !== null) params['minPrice'] = this.minPrice;
    if (this.maxPrice !== null) params['maxPrice'] = this.maxPrice;
    return params;
  }
  applyPrices() {
    void this.router.navigate(['/search'], { queryParams: this.priceParams() });
  }
  clearPrices() {
    this.minPrice = null;
    this.maxPrice = null;
    this.applyPrices();
  }
}
