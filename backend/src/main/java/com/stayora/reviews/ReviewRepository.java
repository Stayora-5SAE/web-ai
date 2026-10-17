package com.stayora.reviews;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface ReviewRepository extends JpaRepository<Review, UUID> {
  List<Review> findByPropertyIdAndDirectionOrderByCreatedAtDesc(UUID propertyId, String direction);

  List<Review> findBySubjectIdAndDirectionOrderByCreatedAtDesc(UUID subjectId, String direction);

  List<Review> findByAuthorIdOrderByCreatedAtDesc(UUID authorId);

  boolean existsByReservationIdAndDirection(UUID reservationId, String direction);
}
