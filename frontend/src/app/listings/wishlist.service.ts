import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Property } from '../core/models';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly http = inject(HttpClient);
  readonly properties = signal<Property[]>([]);
  private pending: Promise<Property[]> | null = null;
  private generation = 0;
  private identityEpoch = 0;
  load(): Promise<Property[]> {
    if (this.pending) return this.pending;
    const generation = this.generation;
    const pending = firstValueFrom(this.http.get<Property[]>('/api/wishlists'))
      .then((properties) => {
        if (generation === this.generation) this.properties.set(properties);
        return properties;
      })
      .finally(() => {
        if (this.pending === pending) this.pending = null;
      });
    this.pending = pending;
    return this.pending;
  }
  has(id: string) {
    return this.properties().some((property) => property.id === id);
  }
  async toggle(property: Property) {
    const identityEpoch = this.identityEpoch;
    if (this.has(property.id)) {
      await firstValueFrom(this.http.delete<void>(`/api/wishlists/${property.id}`));
      if (identityEpoch !== this.identityEpoch) return;
      this.generation++;
      this.properties.update((properties) => properties.filter((p) => p.id !== property.id));
    } else {
      await firstValueFrom(this.http.put<void>(`/api/wishlists/${property.id}`, {}));
      if (identityEpoch !== this.identityEpoch) return;
      this.generation++;
      this.properties.update((properties) => [
        ...properties.filter((p) => p.id !== property.id),
        property,
      ]);
    }
  }
  reset() {
    this.identityEpoch++;
    this.generation++;
    this.pending = null;
    this.properties.set([]);
  }
}
