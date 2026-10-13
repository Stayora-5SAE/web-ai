package com.stayora.reservations;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {
  private final ReservationService service;

  public ReservationController(ReservationService service) {
    this.service = service;
  }

  @PostMapping("/quote")
  public ReservationService.Quote quote(
      @Valid @RequestBody ReservationService.BookingRequest request) {
    return service.quote(request);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ReservationService.ReservationView create(
      @Valid @RequestBody ReservationService.BookingRequest request) {
    return service.create(request);
  }

  @GetMapping("/{id}")
  public ReservationService.ReservationView get(@PathVariable UUID id) {
    return service.get(id);
  }

  @GetMapping
  public List<ReservationService.ReservationView> trips() {
    return service.trips();
  }

  @GetMapping("/host")
  public List<ReservationService.ReservationView> hostRequests() {
    return service.hostRequests();
  }

  @PatchMapping("/{id}/cancel")
  public ReservationService.ReservationView cancel(
      @PathVariable UUID id, @Valid @RequestBody ReservationService.CancellationRequest request) {
    return service.cancel(id, request.reason());
  }

  @GetMapping("/{id}/payment")
  public ReservationService.PaymentView payment(@PathVariable UUID id) {
    return service.payment(id);
  }
}
