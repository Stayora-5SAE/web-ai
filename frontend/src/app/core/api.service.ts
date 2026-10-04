import { HttpClient, HttpInterceptorFn, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IdentityService } from '../accounts/identity.service';
import {
  Account,
  AiResponse,
  BookingRequest,
  CalendarData,
  Dashboard,
  Property,
  Quote,
  Reservation,
} from './models';
export const demoInterceptor: HttpInterceptorFn = (request, next) => {
  const mode = inject(IdentityService).mode();
  return next(
    request.url.startsWith('/api/')
      ? request.clone({ setHeaders: { 'X-Demo-Identity': mode } })
      : request,
  );
};
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  properties(filters: Record<string, string | number> = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters))
      if (value !== '') params = params.set(key, value);
    return firstValueFrom(this.http.get<Property[]>('/api/properties', { params }));
  }
  property(id: string) {
    return firstValueFrom(this.http.get<Property>(`/api/properties/${id}`));
  }
  me() {
    return firstValueFrom(this.http.get<Account>('/api/accounts/me'));
  }
  quote(request: BookingRequest) {
    return firstValueFrom(this.http.post<Quote>('/api/reservations/quote', request));
  }
  book(request: BookingRequest) {
    return firstValueFrom(this.http.post<Reservation>('/api/reservations', request));
  }
  reservation(id: string) {
    return firstValueFrom(this.http.get<Reservation>(`/api/host/reservations/${id}`));
  }
  hostListings() {
    return firstValueFrom(this.http.get<Property[]>('/api/host/listings'));
  }
  dashboard(month = '') {
    return firstValueFrom(
      this.http.get<Dashboard>('/api/host/dashboard', { params: month ? { month } : {} }),
    );
  }
  calendar(propertyId: string) {
    return firstValueFrom(
      this.http.get<CalendarData>('/api/host/calendar', { params: { propertyId } }),
    );
  }
  decide(id: string, status: 'CONFIRMED' | 'DECLINED') {
    return firstValueFrom(
      this.http.patch<Reservation>(`/api/host/reservations/${id}/status`, { status }),
    );
  }
  assist(skill: string, context: string) {
    return firstValueFrom(this.http.post<AiResponse>('/api/ai/assist', { skill, context }));
  }
}
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse)
    return error.status === 0
      ? 'Unable to reach Stayora. Check that the backend is running and try again.'
      : (error.error?.message ?? 'The request failed. Please try again.');
  return 'Something went wrong. Please try again.';
}
