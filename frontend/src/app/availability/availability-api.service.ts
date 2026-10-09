import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Dashboard, Reservation } from '../core/models';

export interface OwnerBlock {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
}
export interface PriceOverride {
  id: string;
  date: string;
  nightlyPrice: number;
}
export interface HostCalendar {
  reservations: Reservation[];
  blocks: OwnerBlock[];
  prices: PriceOverride[];
}
export interface HostPerformance extends Dashboard {
  bookedNights: number;
  blockedNights: number;
  sellableNights: number;
  pendingRequests: number;
}
@Injectable({ providedIn: 'root' })
export class AvailabilityApi {
  private readonly http = inject(HttpClient);
  calendar(propertyId: string) {
    return firstValueFrom(
      this.http.get<HostCalendar>('/api/host/calendar', { params: { propertyId } }),
    );
  }
  dashboard(month: string) {
    return firstValueFrom(
      this.http.get<HostPerformance>('/api/host/dashboard', { params: { month } }),
    );
  }
  saveBlock(
    id: string,
    body: { propertyId: string; startDate: string; endDate: string; reason: string },
  ) {
    return firstValueFrom(
      id
        ? this.http.put<OwnerBlock>(`/api/host/availability/blocks/${id}`, body)
        : this.http.post<OwnerBlock>('/api/host/availability/blocks', body),
    );
  }
  removeBlock(id: string) {
    return firstValueFrom(this.http.delete<void>(`/api/host/availability/blocks/${id}`));
  }
  savePrice(id: string, body: { propertyId: string; date: string; nightlyPrice: number }) {
    return firstValueFrom(
      id
        ? this.http.put<PriceOverride>(`/api/host/availability/prices/${id}`, body)
        : this.http.post<PriceOverride>('/api/host/availability/prices', body),
    );
  }
  removePrice(id: string) {
    return firstValueFrom(this.http.delete<void>(`/api/host/availability/prices/${id}`));
  }
}
