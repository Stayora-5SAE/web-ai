package com.stayora.reviews;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reviews", schema = "stayora")
class Review {
  @Id UUID id;

  @Column(name = "property_id", nullable = false)
  UUID propertyId;

  @Column(name = "author_id", nullable = false)
  UUID authorId;

  @Column(name = "reservation_id")
  UUID reservationId;

  @Column(nullable = false)
  int rating;

  @Column(nullable = false, columnDefinition = "text")
  String body;

  @Column(name = "created_at", nullable = false)
  Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  Instant updatedAt;
}
