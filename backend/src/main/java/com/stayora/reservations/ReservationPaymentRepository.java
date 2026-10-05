package com.stayora.reservations;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationPaymentRepository extends JpaRepository<ReservationPayment, UUID> {
  Optional<ReservationPayment> findByReservationId(UUID reservationId);
}
