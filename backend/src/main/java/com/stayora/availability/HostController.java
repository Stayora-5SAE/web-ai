package com.stayora.availability;

import com.stayora.accounts.AccountService;
import com.stayora.listings.ListingService;
import com.stayora.reservations.ReservationService;
import com.stayora.shared.ApiException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/host")
public class HostController {
  private final AccountService accounts;
  private final ListingService listings;
  private final ReservationService reservations;
  private final AvailabilityService availability;

  public HostController(
      AccountService accounts,
      ListingService listings,
      ReservationService reservations,
      AvailabilityService availability) {
    this.accounts = accounts;
    this.listings = listings;
    this.reservations = reservations;
    this.availability = availability;
  }

  @GetMapping("/listings")
  public List<ListingService.PropertyView> listings() {
    return listings.forHost(accounts.requireRole("HOST").id());
  }

  @GetMapping("/reservations/{id}")
  public ReservationService.ReservationView reservation(@PathVariable UUID id) {
    accounts.requireRole("HOST");
    return reservations.get(id);
  }

  @PatchMapping("/reservations/{id}/status")
  public ReservationService.ReservationView decide(
      @PathVariable UUID id, @RequestBody Decision request) {
    return reservations.decide(id, request.status());
  }

  @GetMapping("/calendar")
  public CalendarView calendar(@RequestParam UUID propertyId) {
    UUID host = accounts.requireRole("HOST").id();
    if (!listings.get(propertyId).hostId().equals(host)) throw ApiException.forbidden();
    return new CalendarView(
        reservations.forProperty(propertyId), availability.forProperty(propertyId));
  }

  @GetMapping("/dashboard")
  public Dashboard dashboard(@RequestParam(required = false) YearMonth month) {
    UUID host = accounts.requireRole("HOST").id();
    YearMonth period = month == null ? YearMonth.now() : month;
    List<ListingService.PropertyView> properties = listings.forHost(host);
    List<ReservationService.ReservationView> bookings = reservations.forHost(host);
    LocalDate start = period.atDay(1), end = period.plusMonths(1).atDay(1);
    long bookedNights =
        bookings.stream()
            .filter(r -> "CONFIRMED".equals(r.status()))
            .filter(r -> r.checkIn().isBefore(end) && r.checkOut().isAfter(start))
            .mapToLong(
                r ->
                    ChronoUnit.DAYS.between(
                        r.checkIn().isAfter(start) ? r.checkIn() : start,
                        r.checkOut().isBefore(end) ? r.checkOut() : end))
            .sum();
    long live = properties.stream().filter(p -> "PUBLISHED".equals(p.status())).count();
    BigDecimal payout =
        bookings.stream()
            .filter(
                r ->
                    "CONFIRMED".equals(r.status())
                        && !r.checkIn().isBefore(start)
                        && r.checkIn().isBefore(end))
            .map(r -> r.subtotal().add(r.cleaningFee()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    int occupancy =
        live == 0 ? 0 : (int) Math.round(100.0 * bookedNights / (live * period.lengthOfMonth()));
    return new Dashboard(accounts.get(host), period.toString(), live, occupancy, payout, bookings);
  }

  public record Decision(String status) {}

  public record CalendarView(
      List<ReservationService.ReservationView> reservations,
      List<AvailabilityService.BlockView> blocks) {}

  public record Dashboard(
      AccountService.AccountView host,
      String month,
      long activeListings,
      int occupancy,
      BigDecimal payout,
      List<ReservationService.ReservationView> reservations) {}
}
