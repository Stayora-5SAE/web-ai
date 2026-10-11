import { Component, Input, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Property } from '../core/models';
import { SelectionService } from '../core/selection.service';
import { IconComponent } from './icon.component';
import { MoneyPipe } from './money.pipe';
import { WishlistService } from '../listings/wishlist.service';
import { errorMessage } from '../core/api.service';
@Component({
  selector: 'app-property-card',
  standalone: true,
  imports: [RouterLink, IconComponent, MoneyPipe],
  styles: [
    `
      .heart.saved {
        color: var(--terracotta);
        background: var(--sage);
      }
      .wishlist-error {
        color: var(--terracotta);
        margin-top: 8px;
      }
    `,
  ],
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
        [class.saved]="wishlists.has(property.id)"
        [attr.aria-label]="
          (wishlists.has(property.id) ? 'Remove ' : 'Save ') +
          property.title +
          (wishlists.has(property.id) ? ' from wishlist' : ' to wishlist')
        "
        [attr.aria-pressed]="wishlists.has(property.id)"
        [disabled]="busy"
        (click)="toggleWishlist()"
      >
        <app-icon name="heart" />
      </button>
    </div>
    <div class="card-content">
      @if (wishlistError) {
        <p class="wishlist-error text-sm" role="alert">{{ wishlistError }}</p>
      }
      <div class="rating">
        <app-icon name="star" /> {{ property.reviewCount ? property.rating : 'New' }}
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
          ><span class="text-xs"> estimated total</span>
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
export class PropertyCardComponent implements OnInit {
  @Input({ required: true }) property!: Property;
  @Input() horizontal = false;
  readonly selection = inject(SelectionService);
  readonly wishlists = inject(WishlistService);
  busy = false;
  wishlistError = '';
  ngOnInit() {
    void this.wishlists.load().catch(() => this.wishlists.reset());
  }
  async toggleWishlist() {
    if (this.busy) return;
    this.busy = true;
    this.wishlistError = '';
    try {
      await this.wishlists.toggle(this.property);
    } catch (e) {
      this.wishlistError = errorMessage(e);
    } finally {
      this.busy = false;
    }
  }
  get total() {
    return (
      this.property.nightlyPrice * this.selection.nights +
      this.property.cleaningFee +
      this.property.serviceFee
    );
  }
}
