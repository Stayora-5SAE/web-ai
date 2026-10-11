import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MessagingApiService } from './messaging-api.service';

describe('Participant messaging HTTP contracts', () => {
  let api: MessagingApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(MessagingApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('creates an inquiry without accepting a client sender or host identity', async () => {
    const result = api.inquiry('property-id');
    const request = http.expectOne('/api/messages/inquiries');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ propertyId: 'property-id' });
    request.flush({ id: 'thread' });
    expect((await result).id).toBe('thread');
  });
  it('sends plain text and delegates sender identity to the server', async () => {
    const result = api.send('thread', '<b>Arrival question</b>');
    const request = http.expectOne('/api/messages/threads/thread/messages');
    expect(request.request.body).toEqual({ body: '<b>Arrival question</b>' });
    request.flush({ id: 'message', body: '<b>Arrival question</b>' });
    expect((await result).body).toBe('<b>Arrival question</b>');
  });
  it('exposes edit and removal failure instead of claiming completion', async () => {
    const result = api.edit('thread', 'message', 'New question');
    const rejection = expectAsync(result).toBeRejected();
    http
      .expectOne('/api/messages/threads/thread/messages/message')
      .flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    await rejection;
    const removed = api.remove('thread', 'message');
    const request = http.expectOne('/api/messages/threads/thread/messages/message');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await removed;
  });
  it('uses an explicit read mutation, separate from inbox retrieval', async () => {
    const result = api.read('thread');
    const request = http.expectOne('/api/messages/threads/thread/read');
    expect(request.request.method).toBe('POST');
    request.flush({ id: 'thread', unreadCount: 0 });
    expect((await result).unreadCount).toBe(0);
  });
});
