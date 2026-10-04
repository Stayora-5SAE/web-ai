import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Property } from '../core/models';
import { SelectionService } from '../core/selection.service';
import { IconComponent } from './icon.component';
import { MoneyPipe } from './money.pipe';
@Component({
  selector: 'app-property-card',
  standalone: true,
  imports: [RouterLink, IconComponent, MoneyPipe],
  template: ` <article class="property-card" [class.horizontal]="horizontal">
    <div class="card-media">
      <a
        [routerLink]="['/properties', property.id]"
        [queryParams]="selection.params()"
        [attr.aria-label]="'View ' + property.title"
        ><img [src]="property.images[0]" [alt]="property.title" loading="lazy" /></a
      ><span class="badge">{{ property.badge }}</span
      ><button
        class="heart"
        aria-label="Wishlist — available in a future module"
        title="Persistent wishlists are coming with the accounts module"
        disabled
      >
        <app-icon name="heart" />
      </button>
    </div>
    <div class="card-content">
      <div class="rating">
        <app-icon name="star" /> {{ property.rating }}
        <span>({{ property.reviewCount }} reviews)</span>
      </div>
      <a [routerLink]="['/properties', property.id]" [queryParams]="selection.params()"
        ><h3 [class.editorial]="horizontal">{{ property.title }}</h3></a
      >
      <p class="muted text-sm">
        {{ property.destination }} · {{ property.capacity }} guests ·
        {{ property.bedrooms }} bedroom{{ property.bedrooms > 1 ? 's' : '' }}
      </p>
      @if (horizontal) {
        <div class="amenity-chips">
          @for (amenity of property.amenities; track amenity) {
            <span>{{ amenity }}</span>
          }
        </div>
      }
      <div class="card-bottom">
        <div>
          <strong>{{ total | money }}</strong
          ><span class="text-xs"> total</span>
          <p class="text-xs">
            {{ property.nightlyPrice | money }} / night · {{ selection.nights }} nights
          </p>
        </div>
        <a
          class="btn small"
          [routerLink]="['/properties', property.id]"
          [queryParams]="selection.params()"
          >{{ horizontal ? 'View details' : 'Check availability' }}<app-icon name="arrow"
        /></a>
      </div>
    </div>
  </article>`,
})
export class PropertyCardComponent {
  @Input({ required: true }) property!: Property;
  @Input() horizontal = false;
  readonly selection = inject(SelectionService);
  get total() {
    return (
      this.property.nightlyPrice * this.selection.nights +
      this.property.cleaningFee +
      this.property.serviceFee
    );
  }
}
