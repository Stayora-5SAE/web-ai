import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ReviewComponent } from './review.component';
import { Reservation } from '../core/models';
describe('Checkout', () => {
  const quote = {
    propertyId: 'demo',
    checkIn: '2026-11-25',
    checkOut: '2026-11-28',
    guests: 2,
    nights: 3,
    nightlyPrice: 160,
    subtotal: 480,
    cleaningFee: 35,
    serviceFee: 25,
    total: 540,
    currency: 'TND',
  };
  let api: jasmine.SpyObj<ApiService>;
  let component: ReviewComponent;
  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['property', 'quote', 'me', 'book']);
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ propertyId: 'demo' }) } },
        },
      ],
    });
    component = TestBed.runInInjectionContext(() => new ReviewComponent());
    component.quote = quote;
  });
  it('requires agreement before submitting', async () => {
    await component.confirm();
    expect(api.book).not.toHaveBeenCalled();
  });
  it('prevents duplicate clicks while a booking is in flight', async () => {
    let resolve!: (value: Reservation) => void;
    api.book.and.returnValue(
      new Promise<Reservation>((r) => {
        resolve = r;
      }),
    );
    component.agreed = true;
    const first = component.confirm();
    await component.confirm();
    expect(api.book).toHaveBeenCalledTimes(1);
    resolve({ id: 'reservation' } as Reservation);
    await first;
    expect(component.busy).toBeFalse();
  });
});
