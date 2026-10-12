import { PageContextDirective } from '../shared/page-context.directive';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { FeedbackComponent } from '../shared/feedback.component';
import { AiMarkdownComponent } from '../shared/ai-markdown.component';
import { ListingManagementService, PropertyRequest } from './listing-management.service';

@Component({
  selector: 'app-listing-editor',
  standalone: true,
  imports: [PageContextDirective, FormsModule, RouterLink, FeedbackComponent, AiMarkdownComponent],
  styles: [
    `
      .editor {
        max-width: 980px;
      }
      .editor-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 20px;
      }
      .wide {
        grid-column: 1/-1;
      }
      textarea {
        font: inherit;
        font-size: 16px;
        width: 100%;
        min-height: 130px;
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 12px;
        background: white;
        color: var(--ink);
        resize: vertical;
      }
      label {
        font-size: 14px;
        font-weight: 600;
      }
      small {
        display: block;
        font-weight: 400;
        color: var(--muted);
      }
      .invalid {
        color: var(--terracotta);
        font-weight: 400;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }
      .ai-draft {
        margin-top: 16px;
      }
      @media (max-width: 640px) {
        .editor-grid {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
  template: `
    <main
      [appPageContext]="{
        label: 'Listing description',
        skill: 'listing-description',
        facts: aiPageFacts,
        prompts: ['Draft a description for this property', 'Highlight these amenities'],
      }"
      id="main"
      class="container page editor"
    >
      <div class="page-intro">
        <div>
          <a routerLink="/host/listings" class="muted">← Your listings</a>
          <h1>{{ id ? 'Edit your space' : 'Create a listing' }}</h1>
          <p class="muted">Thoughtful details help guests find a stay that feels right.</p>
        </div>
      </div>
      <app-feedback [loading]="loading" [error]="error" (retry)="load()" />
      @if (!loading && !loadFailed) {
        <form #form="ngForm" (ngSubmit)="save(form)" class="panel" novalidate>
          @if (submitted && form.invalid) {
            <p class="inset invalid" role="alert" tabindex="-1" id="listing-validation">
              Check the required fields and number ranges below before saving.
            </p>
          }
          <div class="editor-grid">
            <label class="wide"
              >Listing title<input
                name="title"
                required
                maxlength="180"
                [(ngModel)]="model.title"
                #title="ngModel"
                aria-describedby="title-error"
              />
              @if (title.invalid && (title.touched || submitted)) {
                <small id="title-error" class="invalid"
                  >A title is required (up to 180 characters).</small
                >
              }
            </label>
            <label
              >Destination<input
                name="destination"
                required
                maxlength="120"
                [(ngModel)]="model.destination"
                #destination="ngModel"
                aria-describedby="destination-error"
              />
              @if (destination.invalid && (destination.touched || submitted)) {
                <small id="destination-error" class="invalid">Enter a destination.</small>
              }
            </label>
            <label
              >Category<select name="category" required [(ngModel)]="model.category">
                @for (category of categories; track category) {
                  <option>{{ category }}</option>
                }
              </select></label
            >
            <label class="wide"
              >Description<textarea
                name="description"
                required
                maxlength="6000"
                [(ngModel)]="model.description"
                #description="ngModel"
                aria-describedby="description-error"
              ></textarea>
              @if (description.invalid && (description.touched || submitted)) {
                <small id="description-error" class="invalid"
                  >Describe your space before saving.</small
                >
              }
            </label>
            <section class="wide inset" aria-label="AI description assistant">
              <h3>A little inspiration</h3>
              <p class="muted">
                Draft a description from your listing facts. Review every detail before applying it.
              </p>
              <button
                type="button"
                class="btn sage small mt-2"
                (click)="draftDescription()"
                [disabled]="aiBusy || saving"
              >
                {{ aiBusy ? 'Preparing draft…' : 'Suggest description' }}
              </button>
              @if (aiError) {
                <p class="invalid" role="alert">{{ aiError }}</p>
              }
              @if (aiDraft) {
                <div class="ai-draft">
                  <p class="muted">{{ aiMode }} · Suggested text</p>
                  @if (aiNotice) {
                    <p class="text-xs muted">{{ aiNotice }}</p>
                  }
                  <app-ai-markdown
                    class="inset mt-3"
                    aria-label="Suggested description"
                    [text]="aiDraft"
                  />
                  <button type="button" class="btn secondary small mt-3" (click)="applyDraft()">
                    Apply reviewed draft
                  </button>
                </div>
              }
            </section>
            <label class="wide"
              >Photo URLs<textarea
                name="photos"
                required
                [(ngModel)]="photos"
                #photoInput="ngModel"
                aria-describedby="photo-help photo-error"
                placeholder="https://images.example.com/your-space.jpg"
              ></textarea
              ><small id="photo-help"
                >One HTTP or HTTPS image URL per line, up to 12 photos. No embedded
                credentials.</small
              >
              @if (photoInput.invalid && (photoInput.touched || submitted)) {
                <small id="photo-error" class="invalid">Add at least one photo URL.</small>
              }
            </label>
            <label class="wide"
              >Amenities<input name="amenities" maxlength="2400" [(ngModel)]="amenities" /><small
                >Comma-separated, for example: Wi-Fi, Kitchen, Sea view.</small
              ></label
            >
            @for (field of numbers; track field.key) {
              <label
                >{{ field.label
                }}<input
                  type="number"
                  [name]="field.key"
                  required
                  [min]="field.min"
                  [max]="field.max"
                  [step]="field.step"
                  [(ngModel)]="model[field.key]"
                  #number="ngModel"
                  [attr.aria-describedby]="field.key + '-error'"
                />
                @if (number.invalid && (number.touched || submitted)) {
                  <small [id]="field.key + '-error'" class="invalid"
                    >Use a number from {{ field.min }} to {{ field.max }}.</small
                  >
                }
              </label>
            }
            <label class="wide"
              >Visibility<select name="status" [(ngModel)]="model.status">
                <option value="DRAFT">Draft · only you can preview</option>
                <option value="PUBLISHED">Published · open for reservations</option></select
              ><small
                >Existing reservations keep their original agreed price after an edit.</small
              ></label
            >
          </div>
          <div class="actions">
            <button class="btn" type="submit" [disabled]="saving || aiBusy">
              {{ saving ? 'Saving…' : 'Save listing' }}</button
            ><a class="btn secondary" routerLink="/host/listings">Cancel</a>
          </div>
        </form>
      }
    </main>
  `,
})
export class ListingEditorComponent implements OnInit {
  get aiPageFacts() {
    return JSON.stringify({
      destination: this.model.destination,
      category: this.model.category,
      guests: this.model.capacity,
      bedrooms: this.model.bedrooms,
      bathrooms: this.model.bathrooms,
      amenities: this.amenities,
    });
  }
  private readonly listings = inject(ListingManagementService);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  id = '';
  loading = false;
  loadFailed = false;
  saving = false;
  submitted = false;
  error = '';
  aiError = '';
  aiDraft = '';
  aiMode = '';
  aiNotice = '';
  aiBusy = false;
  photos = '';
  amenities = '';
  readonly categories = ['Apartments', 'Houses', 'Guesthouses / Dars', 'Coastal Escapes'];
  readonly numbers: {
    key:
      | 'capacity'
      | 'bedrooms'
      | 'bathrooms'
      | 'latitude'
      | 'longitude'
      | 'nightlyPrice'
      | 'cleaningFee'
      | 'serviceFee';
    label: string;
    min: number;
    max: number;
    step: number;
  }[] = [
    { key: 'capacity', label: 'Guests', min: 1, max: 20, step: 1 },
    { key: 'bedrooms', label: 'Bedrooms', min: 0, max: 30, step: 1 },
    { key: 'bathrooms', label: 'Bathrooms', min: 1, max: 30, step: 1 },
    { key: 'latitude', label: 'Latitude', min: -90, max: 90, step: 0.000001 },
    { key: 'longitude', label: 'Longitude', min: -180, max: 180, step: 0.000001 },
    {
      key: 'nightlyPrice',
      label: 'Nightly price (TND)',
      min: 0.001,
      max: 999999999.999,
      step: 0.001,
    },
    { key: 'cleaningFee', label: 'Cleaning fee (TND)', min: 0, max: 999999999.999, step: 0.001 },
    { key: 'serviceFee', label: 'Service fee (TND)', min: 0, max: 999999999.999, step: 0.001 },
  ];
  model: PropertyRequest = {
    title: '',
    destination: '',
    category: 'Apartments',
    description: '',
    images: [],
    amenities: [],
    latitude: 36.88,
    longitude: 10.33,
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    nightlyPrice: 160,
    cleaningFee: 35,
    serviceFee: 25,
    status: 'DRAFT',
  };
  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    void this.load();
  }
  async load() {
    if (!this.id) return;
    this.loading = true;
    this.loadFailed = false;
    this.error = '';
    try {
      const p = await this.listings.get(this.id);
      if (p.status === 'ARCHIVED') {
        this.loadFailed = true;
        this.error = 'Archived listings cannot be edited.';
        return;
      }
      this.model = { ...p, status: p.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT' };
      this.photos = p.images.join('\n');
      this.amenities = p.amenities.join(', ');
    } catch (e) {
      this.loadFailed = true;
      this.error = errorMessage(e);
    } finally {
      this.loading = false;
    }
  }
  async save(form: NgForm) {
    if (this.saving) return;
    this.submitted = true;
    if (form.invalid) {
      queueMicrotask(() => document.getElementById('listing-validation')?.focus());
      return;
    }
    const request = {
      ...this.model,
      images: this.photos
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      amenities: this.amenities
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    this.saving = true;
    this.error = '';
    try {
      if (this.id) await this.listings.update(this.id, request);
      else await this.listings.create(request);
      await this.router.navigate(['/host/listings']);
    } catch (e) {
      this.error = errorMessage(e);
    } finally {
      this.saving = false;
    }
  }
  async draftDescription() {
    if (this.aiBusy) return;
    this.aiBusy = true;
    this.aiError = '';
    const fact = (value: string) => value.replace(/[^\p{L}\p{N} .,/()-]/gu, '').slice(0, 100);
    const context = JSON.stringify({
      destination: fact(this.model.destination),
      category: this.model.category,
      guests: this.model.capacity,
      bedrooms: this.model.bedrooms,
      amenities: fact(this.amenities),
    });
    try {
      const response = await this.api.assist('listing-description', context);
      this.aiDraft = response.text;
      this.aiMode = response.mode;
      this.aiNotice = response.notice ?? '';
    } catch (e) {
      this.aiError = errorMessage(e);
    } finally {
      this.aiBusy = false;
    }
  }
  applyDraft() {
    this.model.description = this.aiDraft.slice(0, 6000);
    this.aiDraft = '';
  }
}
