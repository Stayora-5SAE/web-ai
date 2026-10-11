import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ApiService } from '../core/api.service';
import { PropertyReviewsComponent } from './property-reviews.component';
import { ReviewApiService } from './review-api.service';

describe('PropertyReviewsComponent AI privacy', () => {
  it('sends aggregate counts and rating without guest text or identity', async () => {
    const assist = jasmine
      .createSpy('assist')
      .and.resolveTo({ mode: 'mock', text: 'Small sample.' });
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { assist } },
        { provide: ReviewApiService, useValue: {} },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ propertyId: 'property-id' }) } },
        },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new PropertyReviewsComponent());
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
    await component.summarize();
    expect(assist).toHaveBeenCalledOnceWith(
      'review-summary',
      'reviews count=2; rating average=4.50',
    );
    expect(component.aiText).toBe('Small sample.');
    expect(component.aiMode).toBe('mock');
  });
});
