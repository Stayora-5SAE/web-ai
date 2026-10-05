package com.stayora.messages;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "messages", schema = "stayora")
class ChatMessage {
  @Id UUID id;

  @Column(name = "conversation_id")
  UUID conversationId;

  @Column(name = "reservation_id")
  UUID reservationId;

  @Column(name = "sender_id")
  UUID senderId;

  @Column(columnDefinition = "text")
  String body;

  @Column(name = "created_at")
  Instant createdAt;

  @Column(name = "edited_at")
  Instant editedAt;

  @Column(name = "recipient_read_at")
  Instant recipientReadAt;

  boolean deleted;
}
