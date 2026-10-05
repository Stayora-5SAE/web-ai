package com.stayora.messages;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
  List<ChatMessage> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select m from ChatMessage m where m.id = :id")
  Optional<ChatMessage> lockById(UUID id);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      "update ChatMessage m set m.recipientReadAt = :readAt where m.conversationId = :conversationId and m.senderId <> :viewerId and m.recipientReadAt is null")
  int markReceivedRead(UUID conversationId, UUID viewerId, Instant readAt);
}
