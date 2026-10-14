import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Property } from '../core/models';
import { CalendarComponent } from './calendar.component';
import { AvailabilityApi, OwnerBlock } from './availability-api.service';

describe('Host calendar management', () => {
  let availability: jasmine.SpyObj<AvailabilityApi>;
  let component: CalendarComponent;
  beforeEach(() => {
    availability = jasmine.createSpyObj<AvailabilityApi>('AvailabilityApi', [
      'calendar',
      'saveBlock',
      'removeBlock',
      'savePrice',
      'removePrice',
    ]);
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: {} },
        { provide: AvailabilityApi, useValue: availability },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    });
    component = TestBed.runInInjectionContext(() => new CalendarComponent());
    component.properties = [{ id: 'owned-property', nightlyPrice: 160 } as Property];
    component.propertyId = 'owned-property';
    availability.calendar.and.resolveTo({ reservations: [], blocks: [], prices: [] });
  });
  it('keeps exclusive block end dates available and displays per-date prices', () => {
    component.month = new Date(2027, 0, 1);
    component.data = {
      reservations: [],
      blocks: [
        { id: 'block', startDate: '2027-01-05', endDate: '2027-01-07', reason: 'Owner stay' },
      ],
      prices: [{ id: 'price', date: '2027-01-07', nightlyPrice: 200.125 }],
    };
    const days = component.cells.filter((c) => c !== null);
    expect(days.find((c) => c.date === '2027-01-06')?.blocked).toBeTrue();
    expect(days.find((c) => c.date === '2027-01-07')?.blocked).toBeFalse();
    expect(days.find((c) => c.date === '2027-01-07')?.nightlyPrice).toBe(200.125);
  });
  it('sends selected property and exact dates while preventing duplicate writes', async () => {
    let resolve!: (value: OwnerBlock) => void;
    availability.saveBlock.and.returnValue(
      new Promise<OwnerBlock>((r) => {
        resolve = r;
      }),
    );
    component.blockStart = '2027-01-05';
    component.blockEnd = '2027-01-07';
    const first = component.saveBlock();
    await component.saveBlock();
    expect(availability.saveBlock).toHaveBeenCalledOnceWith('', {
      propertyId: 'owned-property',
      startDate: '2027-01-05',
      endDate: '2027-01-07',
      reason: 'Owner stay',
    });
    resolve({
      id: 'new-block',
      startDate: '2027-01-05',
      endDate: '2027-01-07',
      reason: 'Owner stay',
    });
    await first;
    expect(component.saving).toBeFalse();
    expect(component.notice).toContain('saved');
  });
  it('retains entered data and exposes an actionable failed-write state', async () => {
    availability.savePrice.and.rejectWith(new Error('unavailable'));
    component.priceDate = '2027-01-07';
    component.nightlyPrice = 200.125;
    await component.savePrice();
    expect(component.actionError).toContain('try again');
    expect(component.priceDate).toBe('2027-01-07');
    expect(component.saving).toBeFalse();
  });
});
