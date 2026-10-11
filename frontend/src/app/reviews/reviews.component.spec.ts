import { TestBed } from '@angular/core/testing';
import { ReviewApiService } from './review-api.service';
import { ReviewsComponent } from './reviews.component';

describe('ReviewsComponent validation', () => {
  const api = {
    create: jasmine.createSpy('create'),
    update: jasmine.createSpy('update'),
    mine: () => Promise.resolve([]),
    eligible: () => Promise.resolve([]),
  };
  beforeEach(() => {
    api.create.calls.reset();
    api.update.calls.reset();
    TestBed.configureTestingModule({ providers: [{ provide: ReviewApiService, useValue: api }] });
  });
  it('rejects whitespace-only review bodies without making an API request', async () => {
    const component = TestBed.runInInjectionContext(() => new ReviewsComponent());
    component.body = '               ';
    await component.save();
    expect(component.saveError).toContain('10–2,000');
    expect(api.create).not.toHaveBeenCalled();
  });
  it('prevents repeated submissions while a save is already running', async () => {
    const component = TestBed.runInInjectionContext(() => new ReviewsComponent());
    component.saving = true;
    component.body = 'A comfortable stay.';
    await component.save();
    expect(api.create).not.toHaveBeenCalled();
  });
});
