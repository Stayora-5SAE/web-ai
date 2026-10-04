package com.stayora.reservations;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {
  boolean existsByPropertyIdAndStatusInAndCheckInLessThanAndCheckOutGreaterThan(
      UUID id, Collection<String> statuses, LocalDate end, LocalDate start);

  List<Reservation> findByPropertyId(UUID id);
}
