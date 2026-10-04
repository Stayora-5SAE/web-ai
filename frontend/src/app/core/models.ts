export interface Account {
  id: string;
  name: string;
  email: string;
  role: 'HOST' | 'GUEST';
}
export interface Property {
  id: string;
  hostId: string;
  hostName: string;
  title: string;
  destination: string;
  category: string;
  description: string;
  images: string[];
  amenities: string[];
  badge: string;
  latitude: number;
  longitude: number;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  nightlyPrice: number;
  cleaningFee: number;
  serviceFee: number;
  rating: number;
  reviewCount: number;
  status: 'PUBLISHED' | 'DRAFT';
}
export interface BookingRequest {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}
export interface Quote extends BookingRequest {
  nights: number;
  nightlyPrice: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  total: number;
  currency: string;
}
export interface Reservation {
  id: string;
  reference: string;
  propertyId: string;
  propertyTitle: string;
  image: string;
  guest: Account;
  checkIn: string;
  checkOut: string;
  guests: number;
  nightlyPrice: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  total: number;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED';
  paymentStatus: 'SIMULATED';
}
export interface Dashboard {
  host: Account;
  month: string;
  activeListings: number;
  occupancy: number;
  payout: number;
  reservations: Reservation[];
}
export interface CalendarData {
  reservations: Reservation[];
  blocks: { startDate: string; endDate: string; reason: string }[];
}
export interface AiResponse {
  mode: 'mock';
  skill: string;
  text: string;
}
