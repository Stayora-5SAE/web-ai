package com.stayora.reviews;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface ReviewRepository extends JpaRepository<Review, UUID> {
  List<Review> findByPropertyIdOrderByCreatedAtDesc(UUID propertyId);

  List<Review> findByAuthorIdOrderByCreatedAtDesc(UUID authorId);

  boolean existsByReservationId(UUID reservationId);
}
