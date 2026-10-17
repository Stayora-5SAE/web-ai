import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { IdentityService } from '../accounts/identity.service';
import { ReservationApiService } from '../reservations/reservation-api.service';
import { MessagingApiService } from '../messages/messaging-api.service';
import { DemoTourComponent } from './demo-tour.component';
describe('Guided team demos', () => {
  it('advances from the base module to AI when both steps use the same page', async () => {
    const navigateByUrl = jasmine.createSpy('navigateByUrl').and.resolveTo(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { url: '/host/calendar', navigateByUrl } },
        { provide: ApiService, useValue: {} },
        { provide: IdentityService, useValue: { select: jasmine.createSpy('select') } },
        { provide: ReservationApiService, useValue: {} },
        { provide: MessagingApiService, useValue: {} },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new DemoTourComponent());
    component.steps = [
      { title: 'Calendar', detail: 'Base module', route: '/host/calendar' },
      { title: 'Calendar AI', detail: 'AI integration', route: '/host/calendar', ai: true },
    ];
    const open = jasmine.createSpy('open');
    component.assistantRequested.subscribe(open);
    await component.go(1);
    expect(component.index).toBe(1);
    expect(component.error).toBe('');
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(1);
  });
});
