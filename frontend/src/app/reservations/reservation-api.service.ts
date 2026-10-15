import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Reservation } from '../core/models';

export interface PaymentReceipt {
  id: string | null;
  reservationId: string;
  amount: number;
  currency: 'TND';
  mode: 'SIMULATED';
  status: 'CAPTURED' | 'REFUNDED';
  reference: string;
  capturedAt: string | null;
  refundedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class ReservationApiService {
  private readonly http = inject(HttpClient);
  trips() {
    return firstValueFrom(this.http.get<Reservation[]>('/api/reservations'));
  }
  hostRequests() {
    return firstValueFrom(this.http.get<Reservation[]>('/api/reservations/host'));
  }
  get(id: string) {
    return firstValueFrom(this.http.get<Reservation>(`/api/reservations/${id}`));
  }
  payment(id: string) {
    return firstValueFrom(this.http.get<PaymentReceipt>(`/api/reservations/${id}/payment`));
  }
  cancel(id: string, reason: string) {
    return firstValueFrom(
      this.http.patch<Reservation>(`/api/reservations/${id}/cancel`, { reason }),
    );
  }
}
