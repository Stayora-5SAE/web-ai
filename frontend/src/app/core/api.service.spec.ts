import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ApiService, demoInterceptor, errorMessage } from './api.service';
import { IdentityService } from '../accounts/identity.service';
describe('API contracts', () => {
  let api: ApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([demoInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('encodes filters and sends the current demo identity', async () => {
    TestBed.inject(IdentityService).select('host');
    const promise = api.properties({ destination: 'La Marsa, Tunis', guests: 2, category: '' });
    const request = http.expectOne((r) => r.url === '/api/properties');
    expect(request.request.params.get('destination')).toBe('La Marsa, Tunis');
    expect(request.request.params.has('category')).toBeFalse();
    expect(request.request.headers.get('X-Demo-Identity')).toBe('host');
    request.flush([]);
    expect(await promise).toEqual([]);
  });
  it('submits only booking inputs, never payment details or prices', async () => {
    const body = { propertyId: 'demo', checkIn: '2026-11-25', checkOut: '2026-11-28', guests: 2 };
    const promise = api.book(body);
    const request = http.expectOne('/api/reservations');
    expect(request.request.body).toEqual(body);
    expect(request.request.method).toBe('POST');
    request.flush({ id: 'reservation' });
    expect((await promise).id).toBe('reservation');
  });
  it('shows actionable connection errors and preserves server validation', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain('backend');
    expect(
      errorMessage(new HttpErrorResponse({ status: 409, error: { message: 'Dates unavailable' } })),
    ).toBe('Dates unavailable');
  });
});
