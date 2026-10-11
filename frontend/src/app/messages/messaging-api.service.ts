import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ChatMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  recipientReadAt: string | null;
}
export interface Conversation {
  id: string;
  propertyId: string;
  reservationId: string | null;
  propertyTitle: string;
  subject: string;
  guestId: string;
  hostId: string;
  viewerId: string;
  otherName: string;
  unreadCount: number;
  lastActivity: string;
  messages: ChatMessage[];
}

@Injectable({ providedIn: 'root' })
export class MessagingApiService {
  private readonly http = inject(HttpClient);
  inbox() {
    return firstValueFrom(this.http.get<Conversation[]>('/api/messages'));
  }
  inquiry(propertyId: string) {
    return firstValueFrom(this.http.post<Conversation>('/api/messages/inquiries', { propertyId }));
  }
  reservation(id: string) {
    return firstValueFrom(this.http.post<Conversation>(`/api/messages/reservations/${id}`, {}));
  }
  thread(id: string) {
    return firstValueFrom(this.http.get<Conversation>(`/api/messages/threads/${id}`));
  }
  read(id: string) {
    return firstValueFrom(this.http.post<Conversation>(`/api/messages/threads/${id}/read`, {}));
  }
  send(id: string, body: string) {
    return firstValueFrom(
      this.http.post<ChatMessage>(`/api/messages/threads/${id}/messages`, { body }),
    );
  }
  edit(id: string, messageId: string, body: string) {
    return firstValueFrom(
      this.http.put<ChatMessage>(`/api/messages/threads/${id}/messages/${messageId}`, { body }),
    );
  }
  remove(id: string, messageId: string) {
    return firstValueFrom(
      this.http.delete<void>(`/api/messages/threads/${id}/messages/${messageId}`),
    );
  }
}
