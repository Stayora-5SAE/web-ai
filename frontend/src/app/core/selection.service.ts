import { Injectable } from '@angular/core';
import { ParamMap } from '@angular/router';
import { BookingRequest } from './models';
function date(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
@Injectable({ providedIn: 'root' })
export class SelectionService {
  destination = '';
  category = '';
  checkIn = date(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 25));
  checkOut = date(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 28));
  guests = 2;
  get nights() {
    return Math.max(
      1,
      Math.round((Date.parse(this.checkOut) - Date.parse(this.checkIn)) / 86400000),
    );
  }
  get today() {
    return date(new Date());
  }
  params() {
    return {
      destination: this.destination,
      category: this.category,
      checkIn: this.checkIn,
      checkOut: this.checkOut,
      guests: this.guests,
    };
  }
  booking(propertyId: string): BookingRequest {
    return { propertyId, checkIn: this.checkIn, checkOut: this.checkOut, guests: this.guests };
  }
  restore(params: ParamMap) {
    for (const key of ['destination', 'category', 'checkIn', 'checkOut'] as const)
      if (params.has(key)) this[key] = params.get(key) ?? '';
    if (params.has('guests')) this.guests = Number(params.get('guests'));
  }
}
