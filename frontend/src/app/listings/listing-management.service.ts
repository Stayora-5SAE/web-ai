import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Property } from '../core/models';

export interface PropertyRequest {
  title: string;
  destination: string;
  category: string;
  description: string;
  images: string[];
  amenities: string[];
  latitude: number;
  longitude: number;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  nightlyPrice: number;
  cleaningFee: number;
  serviceFee: number;
  status: 'DRAFT' | 'PUBLISHED';
}

@Injectable({ providedIn: 'root' })
export class ListingManagementService {
  private readonly http = inject(HttpClient);
  get(id: string) {
    return firstValueFrom(this.http.get<Property>(`/api/host/properties/${id}`));
  }
  create(request: PropertyRequest) {
    return firstValueFrom(this.http.post<Property>('/api/host/properties', request));
  }
  update(id: string, request: PropertyRequest) {
    return firstValueFrom(this.http.put<Property>(`/api/host/properties/${id}`, request));
  }
  archive(id: string) {
    return firstValueFrom(this.http.delete<void>(`/api/host/properties/${id}`));
  }
}
