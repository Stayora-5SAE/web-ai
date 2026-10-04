package com.stayora.reservations;

import com.stayora.accounts.AccountService;
import com.stayora.availability.AvailabilityService;
import com.stayora.listings.ListingService;
import com.stayora.listings.ListingService.PropertyView;
import com.stayora.shared.ApiException;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationService {
  private final ReservationRepository reservations;
  private final ListingService listings;
  private final AvailabilityService availability;
  private final AccountService accounts;

  public ReservationService(
      ReservationRepository reservations,
      ListingService listings,
      AvailabilityService availability,
      AccountService accounts) {
    this.reservations = reservations;
    this.listings = listings;
    this.availability = availability;
    this.accounts = accounts;
  }

  public void validateDates(LocalDate start, LocalDate end) {
    if (start == null
        || end == null
        || start.isBefore(LocalDate.now())
        || !end.isAfter(start)
        || ChronoUnit.DAYS.between(start, end) > 90)
      throw ApiException.badRequest(
          "Choose future check-in and check-out dates for a stay of 1–90 nights.");
  }

  public boolean available(UUID propertyId, LocalDate start, LocalDate end) {
    return !availability.blocked(propertyId, start, end)
        && !reservations.existsByPropertyIdAndStatusInAndCheckInLessThanAndCheckOutGreaterThan(
            propertyId, List.of("PENDING", "CONFIRMED"), end, start);
  }

  public Quote quote(BookingRequest request) {
    validateDates(request.checkIn(), request.checkOut());
    PropertyView p = listings.get(request.propertyId());
    if (!"PUBLISHED".equals(p.status())) throw ApiException.notFound();
    if (request.guests() < 1 || request.guests() > p.capacity())
      throw ApiException.badRequest("Guest count exceeds this property's capacity.");
    if (!available(p.id(), request.checkIn(), request.checkOut()))
      throw ApiException.conflict("These dates are no longer available. Choose another stay.");
    long nights = ChronoUnit.DAYS.between(request.checkIn(), request.checkOut());
    BigDecimal subtotal = money(p.nightlyPrice().multiply(BigDecimal.valueOf(nights)));
    return new Quote(
        p.id(),
        request.checkIn(),
        request.checkOut(),
        request.guests(),
        nights,
        p.nightlyPrice(),
        subtotal,
        p.cleaningFee(),
        p.serviceFee(),
        money(subtotal.add(p.cleaningFee()).add(p.serviceFee())),
        "TND");
  }

  @Transactional
  public ReservationView create(BookingRequest request) {
    UUID guestId = accounts.requireRole("GUEST").id();
    listings.lock(request.propertyId());
    Quote q = quote(request);
    Reservation r = new Reservation();
    r.id = UUID.randomUUID();
    r.guestId = guestId;
    r.propertyId = q.propertyId();
    r.checkIn = q.checkIn();
    r.checkOut = q.checkOut();
    r.guests = q.guests();
    r.nightlyPrice = q.nightlyPrice();
    r.subtotal = q.subtotal();
    r.cleaningFee = q.cleaningFee();
    r.serviceFee = q.serviceFee();
    r.total = q.total();
    r.status = "PENDING";
    r.paymentStatus = "SIMULATED";
    r.createdAt = Instant.now();
    return view(reservations.saveAndFlush(r));
  }

  public ReservationView get(UUID id) {
    Reservation r = reservations.findById(id).orElseThrow(ApiException::notFound);
    AccountService.AccountView caller = accounts.current();
    if (!caller.id().equals(r.guestId) && !caller.id().equals(listings.get(r.propertyId).hostId()))
      throw ApiException.forbidden();
    return view(r);
  }

  @Transactional
  public ReservationView decide(UUID id, String decision) {
    UUID hostId = accounts.requireRole("HOST").id();
    Reservation initial = reservations.findById(id).orElseThrow(ApiException::notFound);
    PropertyView p = listings.lock(initial.propertyId);
    if (!hostId.equals(p.hostId())) throw ApiException.forbidden();
    // Reload after acquiring the property lock; another host decision may have completed.
    reservations.flush();
    jakarta.persistence.EntityManager em = entityManager;
    em.refresh(initial);
    if (!"PENDING".equals(initial.status))
      throw ApiException.conflict("This request has already been decided.");
    if (decision == null || !List.of("CONFIRMED", "DECLINED").contains(decision))
      throw ApiException.badRequest("Choose CONFIRMED or DECLINED.");
    initial.status = decision;
    return view(reservations.saveAndFlush(initial));
  }

  @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;

  public List<ReservationView> forProperty(UUID id) {
    return reservations.findByPropertyId(id).stream().map(this::view).toList();
  }

  public List<ReservationView> forHost(UUID id) {
    return listings.forHost(id).stream()
        .flatMap(p -> forProperty(p.id()).stream())
        .sorted((a, b) -> a.checkIn().compareTo(b.checkIn()))
        .toList();
  }

  private ReservationView view(Reservation r) {
    PropertyView p = listings.get(r.propertyId);
    return new ReservationView(
        r.id,
        "ST-" + r.id.toString().replace("-", "").substring(20).toUpperCase(java.util.Locale.ROOT),
        r.propertyId,
        p.title(),
        p.images().get(0),
        accounts.get(r.guestId),
        r.checkIn,
        r.checkOut,
        r.guests,
        r.nightlyPrice,
        r.subtotal,
        r.cleaningFee,
        r.serviceFee,
        r.total,
        r.status,
        r.paymentStatus);
  }

  private BigDecimal money(BigDecimal value) {
    return value.setScale(3, RoundingMode.HALF_UP);
  }

  public record BookingRequest(
      @NotNull UUID propertyId,
      @NotNull LocalDate checkIn,
      @NotNull LocalDate checkOut,
      @Min(1) @Max(20) int guests) {}

  public record Quote(
      UUID propertyId,
      LocalDate checkIn,
      LocalDate checkOut,
      int guests,
      long nights,
      BigDecimal nightlyPrice,
      BigDecimal subtotal,
      BigDecimal cleaningFee,
      BigDecimal serviceFee,
      BigDecimal total,
      String currency) {}

  public record ReservationView(
      UUID id,
      String reference,
      UUID propertyId,
      String propertyTitle,
      String image,
      AccountService.AccountView guest,
      LocalDate checkIn,
      LocalDate checkOut,
      int guests,
      BigDecimal nightlyPrice,
      BigDecimal subtotal,
      BigDecimal cleaningFee,
      BigDecimal serviceFee,
      BigDecimal total,
      String status,
      String paymentStatus) {}
}
