import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReviewApiService } from './review-api.service';

describe('ReviewApiService', () => {
  let service: ReviewApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReviewApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('creates a verified reservation review without author or property spoofing fields', async () => {
    const result = service.create('stay-id', 4, 'A lovely comfortable stay.');
    const request = http.expectOne('/api/reviews');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      reservationId: 'stay-id',
      rating: 4,
      body: 'A lovely comfortable stay.',
    });
    request.flush({ id: 'review-id', rating: 4 });
    expect((await result).rating).toBe(4);
  });
  it('updates and deletes the review resource', async () => {
    const update = service.update('review-id', 3, 'Updated honest stay review.');
    const request = http.expectOne('/api/reviews/review-id');
    expect(request.request.method).toBe('PUT');
    request.flush({ rating: 3 });
    await update;
    const deletion = service.delete('review-id');
    const remove = http.expectOne('/api/reviews/review-id');
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
    await deletion;
  });
});
