import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReservationApiService } from './reservation-api.service';

describe('Reservation lifecycle HTTP contract', () => {
  let api: ReservationApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ReservationApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('sends only cancellation reason, never client payment or refund values', async () => {
    const result = api.cancel('trip-123', 'Dates changed');
    const request = http.expectOne('/api/reservations/trip-123/cancel');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ reason: 'Dates changed' });
    request.flush({ id: 'trip-123', status: 'CANCELLED' });
    expect((await result).status).toBe('CANCELLED');
  });
  it('propagates cancellation failure so the screen cannot claim a refund', async () => {
    const result = api.cancel('trip-123', 'Dates changed');
    const rejection = expectAsync(result).toBeRejected();
    http
      .expectOne('/api/reservations/trip-123/cancel')
      .flush({ message: 'Cancellation closed' }, { status: 409, statusText: 'Conflict' });
    await rejection;
  });
});
