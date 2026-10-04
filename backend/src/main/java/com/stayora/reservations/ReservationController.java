package com.stayora.reservations;

import jakarta.validation.Valid;
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
}
