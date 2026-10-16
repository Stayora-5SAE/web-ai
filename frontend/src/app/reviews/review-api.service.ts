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
  direction?: 'STAY' | 'GUEST';
  subjectId?: string;
  subjectName?: string;
  propertyTitle?: string;
  tags?: string[];
  tagDetails?: ReviewTag[];
}
export interface ReviewTag {
  id: string;
  label: string;
  sentiment: 'GOOD' | 'BAD';
  category: string;
}
export interface TagCount {
  id: string;
  label: string;
  sentiment: 'GOOD' | 'BAD';
  count: number;
}
export interface Reputation {
  rating: number;
  reviewCount: number;
  positiveReviews: number;
  tags: TagCount[];
  reviews: Review[];
}
export interface PropertyReviews {
  propertyId: string;
  rating: number;
  reviewCount: number;
  reviews: Review[];
  tags?: TagCount[];
}
export interface EligibleStay {
  reservationId: string;
  propertyId: string;
  propertyTitle: string;
  image: string;
  checkIn: string;
  checkOut: string;
  guestName?: string;
}
@Injectable({ providedIn: 'root' })
export class ReviewApiService {
  private readonly http = inject(HttpClient);
  property(id: string) {
    return firstValueFrom(this.http.get<PropertyReviews>(`/api/properties/${id}/reviews`));
  }
  eligible(host = false) {
    return firstValueFrom(
      this.http.get<EligibleStay[]>(host ? '/api/host/reviews/eligible' : '/api/reviews/eligible'),
    );
  }
  mine() {
    return firstValueFrom(this.http.get<Review[]>('/api/reviews/mine'));
  }
  tags() {
    return firstValueFrom(this.http.get<ReviewTag[]>('/api/reviews/tags'));
  }
  reputation(host = false) {
    return firstValueFrom(
      this.http.get<Reputation>(host ? '/api/host/reviews' : '/api/reviews/received'),
    );
  }
  guest(id: string) {
    return firstValueFrom(this.http.get<Reputation>(`/api/host/guests/${id}/reviews`));
  }
  create(reservationId: string, rating: number, body: string, tags?: string[], host = false) {
    return firstValueFrom(
      this.http.post<Review>(host ? '/api/host/reviews' : '/api/reviews', {
        reservationId,
        rating,
        body,
        ...(tags ? { tags } : {}),
      }),
    );
  }
  update(id: string, rating: number, body: string, tags?: string[]) {
    return firstValueFrom(
      this.http.put<Review>(`/api/reviews/${id}`, { rating, body, ...(tags ? { tags } : {}) }),
    );
  }
  delete(id: string) {
    return firstValueFrom(this.http.delete<void>(`/api/reviews/${id}`));
  }
}
