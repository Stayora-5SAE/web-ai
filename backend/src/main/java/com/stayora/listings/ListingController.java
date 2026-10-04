package com.stayora.listings;

import com.stayora.accounts.AccountService;
import com.stayora.reservations.ReservationService;
import com.stayora.shared.ApiException;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/properties")
public class ListingController {
  private final ListingService listings;
  private final ReservationService reservations;
  private final AccountService accounts;

  public ListingController(
      ListingService listings, ReservationService reservations, AccountService accounts) {
    this.listings = listings;
    this.reservations = reservations;
    this.accounts = accounts;
  }

  @GetMapping
  public List<ListingService.PropertyView> search(
      @RequestParam(required = false) String destination,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) Integer guests,
      @RequestParam(required = false) LocalDate checkIn,
      @RequestParam(required = false) LocalDate checkOut) {
    if ((checkIn == null) != (checkOut == null))
      throw ApiException.badRequest("Provide both check-in and check-out.");
    if (checkIn != null) reservations.validateDates(checkIn, checkOut);
    return listings.published(destination, category, guests).stream()
        .filter(p -> checkIn == null || reservations.available(p.id(), checkIn, checkOut))
        .toList();
  }

  @GetMapping("/{id}")
  public ListingService.PropertyView get(@PathVariable UUID id) {
    ListingService.PropertyView p = listings.get(id);
    if (!"PUBLISHED".equals(p.status()) && !p.hostId().equals(accounts.current().id()))
      throw ApiException.notFound();
    return p;
  }
}
