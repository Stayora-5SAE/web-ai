import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ApiService } from '../core/api.service';
import { IdentityService } from '../accounts/identity.service';
import { PropertyReviewsComponent } from './property-reviews.component';
import { ReviewApiService } from './review-api.service';

describe('PropertyReviewsComponent AI privacy', () => {
  it('sends aggregate counts and rating without guest text or identity', async () => {
    const assist = jasmine
      .createSpy('assist')
      .and.resolveTo({ mode: 'mock', text: 'Small sample.' });
    TestBed.configureTestingModule({
      imports: [PropertyReviewsComponent],
      providers: [
        provideRouter([]),
        { provide: IdentityService, useValue: { account: () => null } },
        { provide: ApiService, useValue: { assist } },
        {
          provide: ReviewApiService,
          useValue: {
            property: () =>
              Promise.resolve({
                propertyId: 'property-id',
                rating: 4.5,
                reviewCount: 2,
                reviews: [],
              }),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ propertyId: 'property-id' }) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(PropertyReviewsComponent);
    const component = fixture.componentInstance;
    component.data = {
      propertyId: 'property-id',
      rating: 4.5,
      reviewCount: 2,
      reviews: [
        {
          id: 'review-id',
          propertyId: 'property-id',
          authorId: 'private-guest-id',
          authorName: 'Private guest',
          reservationId: 'stay-id',
          rating: 5,
          body: 'A private review text never sent to AI.',
          createdAt: '',
          updatedAt: '',
        },
      ],
    };
    fixture.detectChanges();
    await fixture.whenStable();
    component.loading = false;
    fixture.detectChanges();
    const summary = fixture.nativeElement.querySelector(
      'app-review-summary button',
    ) as HTMLButtonElement;
    expect(summary).toBeTruthy();
    summary.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(assist).toHaveBeenCalledOnceWith(
      'review-summary',
      'reviews count=2; rating average=4.50',
    );
    expect(fixture.nativeElement.querySelector('app-review-summary').textContent).toContain(
      'Small sample.',
    );
  });
});
