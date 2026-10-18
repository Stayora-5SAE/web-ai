import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Reservation } from '../core/models';
import { ReservationApiService } from './reservation-api.service';
import { TripDetailComponent } from './trip-detail.component';

describe('Guest trip cancellation', () => {
  let api: jasmine.SpyObj<ReservationApiService>;
  let component: TripDetailComponent;
  beforeEach(() => {
    api = jasmine.createSpyObj<ReservationApiService>('ReservationApiService', [
      'get',
      'cancel',
      'payment',
    ]);
    TestBed.configureTestingModule({
      providers: [
        { provide: ReservationApiService, useValue: api },
        { provide: ApiService, useValue: {} },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });
    component = TestBed.runInInjectionContext(() => new TripDetailComponent());
    component.trip = { id: 'trip-123', status: 'PENDING', checkIn: '2099-01-01' } as Reservation;
    component.reason = 'Plans changed';
  });
  it('requires explicit cancellation agreement', async () => {
    await component.cancel();
    expect(api.cancel).not.toHaveBeenCalled();
  });
  it('keeps historical trips visible when their public listing is archived', async () => {
    const trip = component.trip!;
    api.get.and.resolveTo(trip);
    api.payment.and.resolveTo({
      id: 'payment-1',
      reservationId: trip.id,
      amount: 540,
      currency: 'TND',
      mode: 'SIMULATED',
      status: 'CAPTURED',
      reference: 'DEMO-trip-123',
      capturedAt: null,
      refundedAt: null,
    });
    Object.assign(TestBed.inject(ActivatedRoute), {
      snapshot: { paramMap: convertToParamMap({ id: trip.id }) },
    });
    Object.assign(TestBed.inject(ApiService), {
      property: jasmine.createSpy('property').and.rejectWith(new Error('Archived')),
    });
    await component.load();
    expect(component.trip).toBe(trip);
    expect(component.payment?.reference).toBe('DEMO-trip-123');
    expect(component.error).toBe('');
  });
  it('prevents duplicate cancellation while the first request is pending', async () => {
    let resolve!: (reservation: Reservation) => void;
    api.cancel.and.returnValue(
      new Promise<Reservation>((r) => {
        resolve = r;
      }),
    );
    api.payment.and.returnValue(
      Promise.resolve({
        id: 'payment-1',
        reservationId: 'trip-123',
        amount: 540,
        currency: 'TND',
        mode: 'SIMULATED',
        status: 'REFUNDED',
        reference: 'DEMO-trip-123',
        capturedAt: null,
        refundedAt: null,
      }),
    );
    component.cancelAgreed = true;
    const first = component.cancel();
    await component.cancel();
    expect(api.cancel).toHaveBeenCalledTimes(1);
    resolve({ id: 'trip-123', status: 'CANCELLED', checkIn: '2099-01-01' } as Reservation);
    await first;
    expect(component.canCancel()).toBeFalse();
    expect(component.notice).toContain('simulated refund');
  });
});
