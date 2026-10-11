import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface Review {
  id: string;
  propertyId: string;
  authorId: string;
  authorName: string;
  reservationId: string | null;
  rating: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}
export interface PropertyReviews {
  propertyId: string;
  rating: number;
  reviewCount: number;
  reviews: Review[];
}
export interface EligibleStay {
  reservationId: string;
  propertyId: string;
  propertyTitle: string;
  image: string;
  checkIn: string;
  checkOut: string;
}
@Injectable({ providedIn: 'root' })
export class ReviewApiService {
  private readonly http = inject(HttpClient);
  property(id: string) {
    return firstValueFrom(this.http.get<PropertyReviews>(`/api/properties/${id}/reviews`));
  }
  eligible() {
    return firstValueFrom(this.http.get<EligibleStay[]>('/api/reviews/eligible'));
  }
  mine() {
    return firstValueFrom(this.http.get<Review[]>('/api/reviews/mine'));
  }
  create(reservationId: string, rating: number, body: string) {
    return firstValueFrom(this.http.post<Review>('/api/reviews', { reservationId, rating, body }));
  }
  update(id: string, rating: number, body: string) {
    return firstValueFrom(this.http.put<Review>(`/api/reviews/${id}`, { rating, body }));
  }
  delete(id: string) {
    return firstValueFrom(this.http.delete<void>(`/api/reviews/${id}`));
  }
}
