import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Property } from '../core/models';
import { WishlistService } from './wishlist.service';

describe('WishlistService', () => {
  let service: WishlistService;
  let http: HttpTestingController;
  const property = { id: 'saved-property', title: 'Courtyard' } as Property;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WishlistService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('coalesces discovery card loads and persists explicit save/remove', async () => {
    const load = service.load();
    expect(service.load()).toBe(load);
    http.expectOne('/api/wishlists').flush([]);
    await load;
    const save = service.toggle(property);
    expect(service.has(property.id)).toBeFalse();
    const put = http.expectOne('/api/wishlists/saved-property');
    expect(put.request.method).toBe('PUT');
    put.flush(null);
    await save;
    expect(service.has(property.id)).toBeTrue();
    const remove = service.toggle(property);
    const deletion = http.expectOne('/api/wishlists/saved-property');
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush(null);
    await remove;
    expect(service.has(property.id)).toBeFalse();
  });
  it('does not expose old account results after identity cache reset', async () => {
    const load = service.load();
    const response = http.expectOne('/api/wishlists');
    service.reset();
    response.flush([property]);
    await load;
    expect(service.properties()).toEqual([]);
  });
});
