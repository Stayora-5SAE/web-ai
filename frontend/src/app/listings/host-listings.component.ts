import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, errorMessage } from '../core/api.service';
import { Property } from '../core/models';
import { FeedbackComponent } from '../shared/feedback.component';
import { IconComponent } from '../shared/icon.component';
import { MoneyPipe } from '../shared/money.pipe';
import { ListingManagementService } from './listing-management.service';
@Component({
  selector: 'app-host-listings',
  standalone: true,
  imports: [RouterLink, FormsModule, FeedbackComponent, IconComponent, MoneyPipe],
  template: ` <main id="main" class="container page">
    <div class="page-intro">
      <div>
        <h1>Your Listings</h1>
        <p class="muted">Thoughtful spaces. Memorable stays. Manage your property portfolio.</p>
      </div>
      <a class="btn" routerLink="/host/listings/new"><app-icon name="plus" /> Create listing</a>
    </div>
    <div class="listing-toolbar">
      <div class="flex flex-wrap gap-2">
        <button class="chip" [class.active]="filter === 'ALL'" (click)="filter = 'ALL'">
          All listings ({{ properties.length }})</button
        ><button
          class="chip"
          [class.active]="filter === 'PUBLISHED'"
          (click)="filter = 'PUBLISHED'"
        >
          Published</button
        ><button class="chip" [class.active]="filter === 'DRAFT'" (click)="filter = 'DRAFT'">
          Drafts
        </button>
        <button class="chip" [class.active]="filter === 'ARCHIVED'" (click)="filter = 'ARCHIVED'">
          Archived
        </button>
      </div>
      <label
        ><span class="sr-only">Search your listings</span
        ><input name="search" placeholder="Search listings…" [(ngModel)]="search"
      /></label>
    </div>
    <app-feedback [loading]="loading" [error]="error" (retry)="load()" />
    @if (archiveId) {
      <div class="inset mb-4" role="alert">
        <strong>Archive this listing?</strong>
        <p>The listing will disappear from guest search. Reservation history stays available.</p>
        <button class="btn small mt-2" [disabled]="busy" (click)="archive()">
          {{ busy ? 'Archiving…' : 'Confirm archive' }}
        </button>
        <button class="btn secondary small ml-2" [disabled]="busy" (click)="archiveId = ''">
          Cancel
        </button>
      </div>
    }
    @for (p of visible; track p.id) {
      <article class="panel host-listing">
        <img [src]="p.images[0]" [alt]="p.title" loading="lazy" />
        <div>
          <div class="flex justify-between gap-4">
            <span class="status" [class.pending]="p.status === 'DRAFT'">{{
              p.status === 'PUBLISHED'
                ? '● Published'
                : p.status === 'ARCHIVED'
                  ? 'Archived'
                  : 'Draft · not bookable'
            }}</span
            ><span class="text-xs">☆ {{ p.rating }} ({{ p.reviewCount }})</span>
          </div>
          <h2>{{ p.title }}</h2>
          <p class="muted">{{ p.destination }} · {{ p.category }}</p>
          <div class="details">
            <span>{{ p.capacity }} guests · {{ p.bedrooms }} bedrooms</span
            ><strong>{{ p.nightlyPrice | money }} / night</strong>
          </div>
          <div class="dashboard-actions">
            <a
              class="btn sage small"
              routerLink="/host/calendar"
              [queryParams]="{ propertyId: p.id }"
              ><app-icon name="calendar" /> Calendar</a
            >
            @if (p.status === 'PUBLISHED') {
              <a class="btn secondary small" [routerLink]="['/properties', p.id]"
                >Preview in guest mode</a
              >
            }
            @if (p.status !== 'ARCHIVED') {
              <a class="btn secondary small" [routerLink]="['/host/listings', p.id, 'edit']"
                >Edit listing</a
              >
              <button class="btn secondary small" [disabled]="busy" (click)="archiveId = p.id">
                Archive
              </button>
            }
          </div>
        </div>
      </article>
    } @empty {
      @if (!loading && !error) {
        <p class="empty">No listings match this filter.</p>
      }
    }
    <div class="inset mt-8">
      <strong>Professional photography tip:</strong> bright photos and thoughtful details help
      guests picture their stay. Preview every detail before publishing.
    </div>
  </main>`,
})
export class HostListingsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly listings = inject(ListingManagementService);
  archiveId = '';
  busy = false;
  properties: Property[] = [];
  loading = true;
  error = '';
  filter = 'ALL';
  search = '';
  get visible() {
    return this.properties.filter(
      (p) =>
        (this.filter === 'ALL' ? p.status !== 'ARCHIVED' : p.status === this.filter) &&
        p.title.toLowerCase().includes(this.search.toLowerCase()),
    );
  }
  ngOnInit() {
    void this.load();
  }
  async load() {
    this.loading = true;
    this.error = '';
    try {
      this.properties = await this.api.hostListings();
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.loading = false;
    }
  }
  async archive() {
    if (this.busy || !this.archiveId) return;
    this.busy = true;
    this.error = '';
    try {
      await this.listings.archive(this.archiveId);
      this.archiveId = '';
      await this.load();
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.busy = false;
    }
  }
}
