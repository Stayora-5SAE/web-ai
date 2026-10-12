import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { IdentityService } from './identity.service';
import { ApiService, demoInterceptor } from '../core/api.service';

describe('Real account sessions', () => {
  let identity: IdentityService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([demoInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    identity = TestBed.inject(IdentityService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('restores server sessions and sends CSRF without demo impersonation', async () => {
    const ready = identity.initialize();
    http.expectOne('/api/auth/session').flush({
      account: { id: 'guest', name: 'Synthetic', email: 'guest@example.invalid', role: 'GUEST' },
      csrfToken: 'csrf',
      demoEnabled: true,
    });
    await ready;
    identity.select('host');
    const request = TestBed.inject(ApiService).book({
      propertyId: 'id',
      checkIn: '2027-01-01',
      checkOut: '2027-01-02',
      guests: 1,
    });
    const sent = http.expectOne('/api/reservations');
    expect(sent.request.headers.get('X-CSRF-Token')).toBe('csrf');
    expect(sent.request.headers.has('X-Demo-Identity')).toBeFalse();
    sent.flush({ id: 'booking' });
    await request;
  });
  it('clears session state only after successful logout', async () => {
    identity.account.set({
      id: 'guest',
      name: 'Synthetic',
      email: 'guest@example.invalid',
      role: 'GUEST',
    });
    identity.csrf.set('csrf');
    const request = identity.signOut();
    expect(identity.account()).not.toBeNull();
    http.expectOne('/api/auth/logout').flush(null);
    await request;
    expect(identity.account()).toBeNull();
    expect(identity.csrf()).toBe('');
  });
});
