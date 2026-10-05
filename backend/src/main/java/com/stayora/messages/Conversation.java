package com.stayora.messages;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversations", schema = "stayora")
class Conversation {
  @Id UUID id;

  @Column(name = "property_id")
  UUID propertyId;

  @Column(name = "reservation_id")
  UUID reservationId;

  @Column(name = "guest_id")
  UUID guestId;

  @Column(name = "host_id")
  UUID hostId;

  String subject;

  @Column(name = "created_at")
  Instant createdAt;

  @Column(name = "guest_read_at")
  Instant guestReadAt;

  @Column(name = "host_read_at")
  Instant hostReadAt;
}
