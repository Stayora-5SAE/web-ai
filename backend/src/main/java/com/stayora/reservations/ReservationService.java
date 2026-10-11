package com.stayora.reservations;

import com.stayora.accounts.AccountService;
import com.stayora.availability.AvailabilityService;
import com.stayora.listings.ListingService;
import com.stayora.listings.ListingService.PropertyView;
import com.stayora.shared.ApiException;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
  private final ReservationPaymentRepository payments;

  public ReservationService(
      ReservationRepository reservations,
      ListingService listings,
      AvailabilityService availability,
      AccountService accounts,
      ReservationPaymentRepository payments) {
    this.reservations = reservations;
    this.listings = listings;
    this.availability = availability;
    this.accounts = accounts;
    this.payments = payments;
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
    BigDecimal subtotal =
        money(
            availability.accommodationTotal(
                p.id(), request.checkIn(), request.checkOut(), p.nightlyPrice()));
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
    reservations.saveAndFlush(r);
    recordPayment(r);
    return view(r);
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
    if (initial.checkIn.isBefore(LocalDate.now()))
      throw ApiException.conflict("A request whose check-in has passed cannot be decided.");
    if (decision == null || !List.of("CONFIRMED", "DECLINED").contains(decision))
      throw ApiException.badRequest("Choose CONFIRMED or DECLINED.");
    initial.status = decision;
    if ("DECLINED".equals(decision)) refund(initial);
    return view(reservations.saveAndFlush(initial));
  }

  public List<ReservationView> trips() {
    return reservations.findByGuestIdOrderByCheckInDesc(accounts.requireRole("GUEST").id()).stream()
        .map(this::view)
        .toList();
  }

  public List<ReservationView> hostRequests() {
    return forHost(accounts.requireRole("HOST").id());
  }

  @Transactional
  public ReservationView cancel(UUID id, String reason) {
    UUID guestId = accounts.requireRole("GUEST").id();
    Reservation r = reservations.findById(id).orElseThrow(ApiException::notFound);
    if (!guestId.equals(r.guestId)) throw ApiException.forbidden();
    listings.lock(r.propertyId);
    entityManager.refresh(r);
    if (!List.of("PENDING", "CONFIRMED").contains(r.status))
      throw ApiException.conflict("Only pending or confirmed stays can be cancelled.");
    if (!r.checkIn.isAfter(LocalDate.now()))
      throw ApiException.conflict("Cancellation closes on the check-in date.");
    if (reason == null || reason.trim().length() < 3 || reason.trim().length() > 500)
      throw ApiException.badRequest("Provide a cancellation reason between 3 and 500 characters.");
    r.status = "CANCELLED";
    r.cancelledAt = Instant.now();
    r.cancellationReason = reason.trim();
    refund(r);
    return view(reservations.saveAndFlush(r));
  }

  public PaymentView payment(UUID id) {
    ReservationView owned = get(id);
    return payments
        .findByReservationId(id)
        .map(this::paymentView)
        .orElseGet(
            () ->
                new PaymentView(
                    null,
                    id,
                    owned.total(),
                    "TND",
                    "SIMULATED",
                    "SIMULATED_REFUNDED".equals(owned.paymentStatus()) ? "REFUNDED" : "CAPTURED",
                    "DEMO-" + id,
                    null,
                    null));
  }

  /** Service contract for reviews: only the guest of a completed confirmed stay is eligible. */
  public boolean eligibleForReview(UUID reservationId, UUID guestId) {
    Reservation r = reservations.findById(reservationId).orElseThrow(ApiException::notFound);
    return r.guestId.equals(guestId)
        && "CONFIRMED".equals(r.status)
        && !r.checkOut.isAfter(LocalDate.now());
  }

  private ReservationPayment recordPayment(Reservation r) {
    return payments
        .findByReservationId(r.id)
        .orElseGet(
            () -> {
              ReservationPayment payment = new ReservationPayment();
              payment.id = UUID.randomUUID();
              payment.reservationId = r.id;
              payment.amount = r.total;
              payment.currency = "TND";
              payment.mode = "SIMULATED";
              payment.status = "CAPTURED";
              payment.reference = "DEMO-" + r.id;
              payment.capturedAt = r.createdAt;
              return payments.saveAndFlush(payment);
            });
  }

  private void refund(Reservation r) {
    ReservationPayment payment = recordPayment(r);
    payment.status = "REFUNDED";
    payment.refundedAt = Instant.now();
    payments.saveAndFlush(payment);
    r.paymentStatus = "SIMULATED_REFUNDED";
  }

  private PaymentView paymentView(ReservationPayment p) {
    return new PaymentView(
        p.id,
        p.reservationId,
        p.amount,
        p.currency,
        p.mode,
        p.status,
        p.reference,
        p.capturedAt,
        p.refundedAt);
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

  public record CancellationRequest(@NotBlank @Size(min = 3, max = 500) String reason) {}

  public record PaymentView(
      UUID id,
      UUID reservationId,
      BigDecimal amount,
      String currency,
      String mode,
      String status,
      String reference,
      Instant capturedAt,
      Instant refundedAt) {}

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
