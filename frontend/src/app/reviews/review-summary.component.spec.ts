import { TestBed } from '@angular/core/testing';
import { ApiService } from '../core/api.service';
import { AiResponse } from '../core/models';
import { ReviewSummaryComponent } from './review-summary.component';

describe('Shared review summaries', () => {
  let assist: jasmine.Spy;
  let component: ReviewSummaryComponent;
  beforeEach(() => {
    assist = jasmine.createSpy('assist');
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: { assist } }] });
    component = TestBed.runInInjectionContext(() => new ReviewSummaryComponent());
  });
  it('does not summarize an empty review sample', async () => {
    await component.summarize();
    expect(assist).not.toHaveBeenCalled();
  });
  it('uses only aggregate values and preserves the provider mode', async () => {
    component.count = 3;
    component.rating = 4.333;
    assist.and.resolveTo({ mode: 'mock', skill: 'review-summary', text: 'Small sample.' });
    await component.summarize();
    expect(assist).toHaveBeenCalledOnceWith(
      'review-summary',
      'reviews count=3; rating average=4.33',
    );
    expect(component.response?.mode).toBe('mock');
  });
  it('discards a late result after switching the reviewed subject', async () => {
    let resolve!: (response: AiResponse) => void;
    assist.and.returnValue(new Promise<AiResponse>((r) => (resolve = r)));
    component.count = 2;
    const pending = component.summarize();
    component.scope = 'another-guest';
    component.ngOnChanges();
    resolve({ mode: 'mock', skill: 'review-summary', text: 'Old guest' });
    await pending;
    expect(component.response).toBeNull();
    expect(component.busy).toBeFalse();
  });
});
