import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { PageContextDirective, PageContextService } from './page-context.directive';
describe('Page assistant context', () => {
  it('publishes the latest context and cancels pending publication when a page closes', fakeAsync(() => {
    TestBed.configureTestingModule({});
    const context = TestBed.inject(PageContextService);
    const directive = TestBed.runInInjectionContext(() => new PageContextDirective());
    directive.appPageContext = {
      label: 'Calendar',
      skill: 'host-summary',
      facts: 'confirmedNights=3',
      prompts: [],
    };
    directive.ngOnChanges();
    directive.appPageContext = { ...directive.appPageContext, facts: 'confirmedNights=6' };
    directive.ngOnChanges();
    flushMicrotasks();
    expect(context.current?.facts).toBe('confirmedNights=6');
    directive.appPageContext = { ...directive.appPageContext, facts: 'confirmedNights=9' };
    directive.ngOnChanges();
    directive.ngOnDestroy();
    flushMicrotasks();
    expect(context.current).toBeNull();
  }));
});
