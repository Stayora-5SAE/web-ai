package com.stayora.messages;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/messages")
public class MessagingController {
  private final MessagingService service;

  public MessagingController(MessagingService service) {
    this.service = service;
  }

  @GetMapping
  public List<MessagingService.ThreadView> inbox() {
    return service.inbox();
  }

  @PostMapping("/inquiries")
  public MessagingService.ThreadView inquiry(
      @Valid @RequestBody MessagingService.InquiryRequest request) {
    return service.inquiry(request.propertyId());
  }

  @PostMapping("/reservations/{id}")
  public MessagingService.ThreadView reservation(@PathVariable UUID id) {
    return service.reservation(id);
  }

  @GetMapping("/threads/{id}")
  public MessagingService.ThreadView thread(@PathVariable UUID id) {
    return service.thread(id);
  }

  @PostMapping("/threads/{id}/read")
  public MessagingService.ThreadView read(@PathVariable UUID id) {
    return service.markRead(id);
  }

  @PostMapping("/threads/{id}/messages")
  @ResponseStatus(HttpStatus.CREATED)
  public MessagingService.MessageView send(
      @PathVariable UUID id, @Valid @RequestBody MessagingService.MessageRequest request) {
    return service.send(id, request.body());
  }

  @PutMapping("/threads/{id}/messages/{messageId}")
  public MessagingService.MessageView edit(
      @PathVariable UUID id,
      @PathVariable UUID messageId,
      @Valid @RequestBody MessagingService.MessageRequest request) {
    return service.edit(id, messageId, request.body());
  }

  @DeleteMapping("/threads/{id}/messages/{messageId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id, @PathVariable UUID messageId) {
    service.delete(id, messageId);
  }
}
