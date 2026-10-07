package com.stayora.messages;

import com.stayora.accounts.AccountService;
import com.stayora.listings.ListingService;
import com.stayora.reservations.ReservationService;
import com.stayora.shared.ApiException;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MessagingService {
  private final ConversationRepository conversations;
  private final ChatMessageRepository messages;
  private final AccountService accounts;
  private final ListingService listings;
  private final ReservationService reservations;

  public MessagingService(
      ConversationRepository conversations,
      ChatMessageRepository messages,
      AccountService accounts,
      ListingService listings,
      ReservationService reservations) {
    this.conversations = conversations;
    this.messages = messages;
    this.accounts = accounts;
    this.listings = listings;
    this.reservations = reservations;
  }

  public List<ThreadView> inbox() {
    UUID caller = accounts.current().id();
    return conversations.findByGuestIdOrHostIdOrderByCreatedAtDesc(caller, caller).stream()
        .map(c -> view(c, caller))
        .sorted((a, b) -> b.lastActivity().compareTo(a.lastActivity()))
        .toList();
  }

  @Transactional
  public ThreadView inquiry(UUID propertyId) {
    UUID guestId = accounts.requireRole("GUEST").id();
    var property = listings.lock(propertyId);
    if (!"PUBLISHED".equals(property.status())) throw ApiException.notFound();
    if (guestId.equals(property.hostId()))
      throw ApiException.badRequest("You cannot start a conversation with yourself.");
    Conversation c =
        conversations
            .findByPropertyIdAndGuestIdAndHostIdAndReservationIdIsNull(
                propertyId, guestId, property.hostId())
            .orElseGet(
                () ->
                    newConversation(
                        propertyId, null, guestId, property.hostId(), "Property inquiry"));
    return view(c, guestId);
  }

  @Transactional
  public ThreadView reservation(UUID reservationId) {
    var reservation = reservations.get(reservationId);
    var property = listings.lock(reservation.propertyId());
    Conversation c =
        conversations
            .findByReservationId(reservationId)
            .orElseGet(
                () ->
                    newConversation(
                        property.id(),
                        reservationId,
                        reservation.guest().id(),
                        property.hostId(),
                        "Stay " + reservation.reference()));
    return view(c, accounts.current().id());
  }

  private Conversation newConversation(
      UUID propertyId, UUID reservationId, UUID guestId, UUID hostId, String subject) {
    Conversation c = new Conversation();
    c.id = UUID.randomUUID();
    c.propertyId = propertyId;
    c.reservationId = reservationId;
    c.guestId = guestId;
    c.hostId = hostId;
    c.subject = subject;
    c.createdAt = Instant.now();
    return conversations.saveAndFlush(c);
  }

  public ThreadView thread(UUID id) {
    return view(participant(id), accounts.current().id());
  }

  @Transactional
  public ThreadView markRead(UUID id) {
    Conversation c = participant(id);
    if (c.guestId.equals(accounts.current().id())) c.guestReadAt = Instant.now();
    else c.hostReadAt = Instant.now();
    conversations.saveAndFlush(c);
    // Mark the statement's visible received rows, so a later arrival remains unread.
    messages.markReceivedRead(c.id, accounts.current().id(), Instant.now());
    return view(c, accounts.current().id());
  }

  @Transactional
  public MessageView send(UUID id, String body) {
    Conversation c = participant(id);
    ChatMessage message = new ChatMessage();
    message.id = UUID.randomUUID();
    message.conversationId = c.id;
    message.reservationId = c.reservationId;
    message.senderId = accounts.current().id();
    message.body = body(body);
    message.createdAt = Instant.now();
    return messageView(messages.saveAndFlush(message));
  }

  @Transactional
  public MessageView edit(UUID conversationId, UUID messageId, String body) {
    ChatMessage message = ownedMessage(conversationId, messageId);
    if (message.deleted) throw ApiException.conflict("A removed message cannot be edited.");
    message.body = body(body);
    message.editedAt = Instant.now();
    return messageView(messages.saveAndFlush(message));
  }

  @Transactional
  public void delete(UUID conversationId, UUID messageId) {
    ChatMessage message = ownedMessage(conversationId, messageId);
    message.body = "";
    message.deleted = true;
    message.editedAt = Instant.now();
    messages.saveAndFlush(message);
  }

  private String body(String text) {
    if (text == null || text.isBlank() || text.trim().length() > 2000)
      throw ApiException.badRequest("Write a message between 1 and 2,000 characters.");
    return text.trim();
  }

  private Conversation participant(UUID id) {
    Conversation c = conversations.findById(id).orElseThrow(ApiException::notFound);
    UUID caller = accounts.current().id();
    if (!caller.equals(c.guestId) && !caller.equals(c.hostId)) throw ApiException.forbidden();
    return c;
  }

  private ChatMessage ownedMessage(UUID conversationId, UUID messageId) {
    participant(conversationId);
    ChatMessage m = messages.lockById(messageId).orElseThrow(ApiException::notFound);
    if (!m.conversationId.equals(conversationId)) throw ApiException.notFound();
    if (!m.senderId.equals(accounts.current().id())) throw ApiException.forbidden();
    return m;
  }

  private ThreadView view(Conversation c, UUID caller) {
    var property = listings.get(c.propertyId);
    var chat = messages.findByConversationIdOrderByCreatedAtAsc(c.id);
    long unread =
        chat.stream()
            .filter(m -> !m.deleted && !m.senderId.equals(caller) && m.recipientReadAt == null)
            .count();
    Instant lastActivity = chat.isEmpty() ? c.createdAt : chat.get(chat.size() - 1).createdAt;
    return new ThreadView(
        c.id,
        c.propertyId,
        c.reservationId,
        property.title(),
        c.subject,
        c.guestId,
        c.hostId,
        caller,
        accounts.get(caller.equals(c.guestId) ? c.hostId : c.guestId).name(),
        unread,
        lastActivity,
        chat.stream().map(this::messageView).toList());
  }

  private MessageView messageView(ChatMessage m) {
    return new MessageView(
        m.id,
        m.senderId,
        m.deleted ? "" : m.body,
        m.createdAt,
        m.editedAt,
        m.deleted,
        m.recipientReadAt);
  }

  public record InquiryRequest(@NotNull UUID propertyId) {}

  public record MessageRequest(@NotBlank @Size(max = 2000) String body) {}

  public record MessageView(
      UUID id,
      UUID senderId,
      String body,
      Instant createdAt,
      Instant editedAt,
      boolean deleted,
      Instant recipientReadAt) {}

  public record ThreadView(
      UUID id,
      UUID propertyId,
      UUID reservationId,
      String propertyTitle,
      String subject,
      UUID guestId,
      UUID hostId,
      UUID viewerId,
      String otherName,
      long unreadCount,
      Instant lastActivity,
      List<MessageView> messages) {}
}
