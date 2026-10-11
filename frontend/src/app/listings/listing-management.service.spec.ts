import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ListingManagementService, PropertyRequest } from './listing-management.service';

describe('ListingManagementService', () => {
  let service: ListingManagementService;
  let http: HttpTestingController;
  const request: PropertyRequest = {
    title: 'Courtyard',
    destination: 'La Marsa',
    category: 'Houses',
    description: 'A sunny space.',
    images: ['https://example.com/photo.jpg'],
    amenities: ['Kitchen'],
    latitude: 36.88,
    longitude: 10.33,
    capacity: 4,
    bedrooms: 2,
    bathrooms: 1,
    nightlyPrice: 123.456,
    cleaningFee: 10,
    serviceFee: 5,
    status: 'DRAFT',
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ListingManagementService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('uses owner endpoints with only property facts for create and update', async () => {
    const created = service.create(request);
    const post = http.expectOne('/api/host/properties');
    expect(post.request.method).toBe('POST');
    expect(post.request.body.hostId).toBeUndefined();
    expect(post.request.body.nightlyPrice).toBe(123.456);
    post.flush({ ...request, id: 'property-one' });
    expect((await created).id).toBe('property-one');
    const updated = service.update('property-one', { ...request, status: 'PUBLISHED' });
    const put = http.expectOne('/api/host/properties/property-one');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.status).toBe('PUBLISHED');
    put.flush({ ...request, id: 'property-one', status: 'PUBLISHED' });
    expect((await updated).status).toBe('PUBLISHED');
  });
  it('propagates archive conflicts so the UI can explain active bookings', async () => {
    const archive = service.archive('property-one');
    const rejected = expectAsync(archive).toBeRejected();
    const deletion = http.expectOne('/api/host/properties/property-one');
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush(
      { message: 'Resolve upcoming reservations.' },
      { status: 409, statusText: 'Conflict' },
    );
    await rejected;
  });
});
