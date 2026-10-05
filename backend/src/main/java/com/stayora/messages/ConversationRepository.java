package com.stayora.messages;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface ConversationRepository extends JpaRepository<Conversation, UUID> {
  List<Conversation> findByGuestIdOrHostIdOrderByCreatedAtDesc(UUID guestId, UUID hostId);

  Optional<Conversation> findByReservationId(UUID reservationId);

  Optional<Conversation> findByPropertyIdAndGuestIdAndHostIdAndReservationIdIsNull(
      UUID propertyId, UUID guestId, UUID hostId);
}
