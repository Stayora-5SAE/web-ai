import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ReviewApiService } from './review-api.service';
import { ReviewsComponent } from './reviews.component';

describe('ReviewsComponent validation', () => {
  const api = {
    create: jasmine.createSpy('create'),
    update: jasmine.createSpy('update'),
    mine: () => Promise.resolve([]),
    eligible: () => Promise.resolve([]),
    reputation: () => Promise.resolve({ rating: 0, reviewCount: 0, tags: [], reviews: [] }),
    tags: () => Promise.resolve([]),
  };
  beforeEach(() => {
    api.create.calls.reset();
    api.update.calls.reset();
    TestBed.configureTestingModule({ providers: [{ provide: ReviewApiService, useValue: api }] });
  });
  it('rejects whitespace-only review bodies without making an API request', async () => {
    const component = TestBed.runInInjectionContext(() => new ReviewsComponent());
    component.body = '               ';
    await component.save();
    expect(component.saveError).toContain('10–2,000');
    expect(api.create).not.toHaveBeenCalled();
  });
  it('prevents repeated submissions while a save is already running', async () => {
    const component = TestBed.runInInjectionContext(() => new ReviewsComponent());
    component.saving = true;
    component.body = 'A comfortable stay.';
    await component.save();
    expect(api.create).not.toHaveBeenCalled();
  });
  it('replaces an opposite tag in the same topic and allows removing a selection', () => {
    const component = TestBed.runInInjectionContext(() => new ReviewsComponent());
    const clean = {
      id: 'clean',
      label: 'Clean',
      sentiment: 'GOOD' as const,
      category: 'cleanliness',
    };
    const dirty = {
      id: 'needs-cleaning',
      label: 'Needs cleaning',
      sentiment: 'BAD' as const,
      category: 'cleanliness',
    };
    component.tagOptions = [clean, dirty];
    component.toggleTag(clean);
    component.toggleTag(dirty);
    expect(component.selectedTags).toEqual(['needs-cleaning']);
    component.toggleTag(dirty);
    expect(component.selectedTags).toEqual([]);
  });
  it('renders host mode without tag selection and submits guest feedback to the host API', async () => {
    TestBed.configureTestingModule({
      imports: [ReviewsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { host: true }, queryParamMap: convertToParamMap({}) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(ReviewsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.start({
      reservationId: 'stay',
      propertyId: 'property',
      propertyTitle: 'Courtyard',
      image: '',
      checkIn: '2026-01-01',
      checkOut: '2026-01-03',
      guestName: 'Sami',
    });
    component.body = 'A thoughtful and considerate guest.';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('How was hosting this guest?');
    expect(fixture.nativeElement.querySelector('button.pill')).toBeNull();
    await component.save();
    expect(api.create).toHaveBeenCalledOnceWith(
      'stay',
      5,
      'A thoughtful and considerate guest.',
      [],
      true,
    );
  });
});
