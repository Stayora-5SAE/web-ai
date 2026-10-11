package com.stayora.listings;

import com.stayora.accounts.AccountService;
import com.stayora.reservations.ReservationService;
import com.stayora.shared.ApiException;
import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PropertyManagementService {
  private static final List<String> CATEGORIES =
      List.of("Apartments", "Houses", "Guesthouses / Dars", "Coastal Escapes");
  private final PropertyRepository properties;
  private final ListingService listings;
  private final AccountService accounts;
  private final ReservationService reservations;

  public PropertyManagementService(
      PropertyRepository properties,
      ListingService listings,
      AccountService accounts,
      ReservationService reservations) {
    this.properties = properties;
    this.listings = listings;
    this.accounts = accounts;
    this.reservations = reservations;
  }

  public ListingService.PropertyView owned(UUID id) {
    var host = accounts.requireRole("HOST");
    var p = listings.get(id);
    if (!host.id().equals(p.hostId())) throw ApiException.forbidden();
    return p;
  }

  @Transactional
  public ListingService.PropertyView create(PropertyRequest request) {
    UUID hostId = accounts.requireRole("HOST").id();
    validate(request);
    Property p = new Property();
    p.id = UUID.randomUUID();
    p.hostId = hostId;
    p.badge = "";
    p.rating = new BigDecimal("0.00");
    p.reviewCount = 0;
    apply(p, request);
    properties.saveAndFlush(p);
    return listings.get(p.id);
  }

  @Transactional
  public ListingService.PropertyView update(UUID id, PropertyRequest request) {
    Property p = lockOwned(id);
    if (p.archived) throw ApiException.conflict("Archived properties cannot be edited.");
    validate(request);
    if (futureBookings(id).stream().anyMatch(r -> r.guests() > request.capacity()))
      throw ApiException.conflict(
          "Capacity cannot be lower than an upcoming reservation's guest count.");
    apply(p, request);
    properties.saveAndFlush(p);
    return listings.get(id);
  }

  @Transactional
  public void archive(UUID id) {
    Property p = lockOwned(id);
    if (p.archived) return;
    if (!futureBookings(id).isEmpty())
      throw ApiException.conflict(
          "Resolve upcoming pending or confirmed reservations before archiving this listing.");
    p.archived = true;
    p.status = "DRAFT";
    properties.saveAndFlush(p);
  }

  private Property lockOwned(UUID id) {
    UUID hostId = accounts.requireRole("HOST").id();
    Property p = properties.lockById(id).orElseThrow(ApiException::notFound);
    if (!hostId.equals(p.hostId)) throw ApiException.forbidden();
    return p;
  }

  private List<ReservationService.ReservationView> futureBookings(UUID id) {
    return reservations.forProperty(id).stream()
        .filter(r -> List.of("PENDING", "CONFIRMED").contains(r.status()))
        .filter(r -> r.checkOut().isAfter(LocalDate.now()))
        .toList();
  }

  private void validate(PropertyRequest r) {
    if (!CATEGORIES.contains(r.category()))
      throw ApiException.badRequest("Choose a supported property category.");
    if (!List.of("DRAFT", "PUBLISHED").contains(r.status()))
      throw ApiException.badRequest("Choose DRAFT or PUBLISHED.");
    if (!Double.isFinite(r.latitude()) || !Double.isFinite(r.longitude()))
      throw ApiException.badRequest("Coordinates must be finite numbers.");
    for (String image : r.images()) {
      try {
        URI uri = URI.create(image);
        if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))
            || uri.getHost() == null
            || uri.getUserInfo() != null
            || image.contains("|")) throw new IllegalArgumentException();
      } catch (IllegalArgumentException e) {
        throw ApiException.badRequest(
            "Every photo must use a valid public HTTP or HTTPS URL without credentials.");
      }
    }
    if (r.amenities().stream().anyMatch(a -> a.contains("|")))
      throw ApiException.badRequest("Amenities cannot contain the pipe separator.");
  }

  private void apply(Property p, PropertyRequest r) {
    p.title = r.title().strip();
    p.destination = r.destination().strip();
    p.category = r.category();
    p.description = r.description().strip();
    p.imageUrls = String.join("|", r.images());
    p.amenities = String.join("|", r.amenities().stream().map(String::strip).distinct().toList());
    p.latitude = r.latitude();
    p.longitude = r.longitude();
    p.capacity = r.capacity();
    p.bedrooms = r.bedrooms();
    p.bathrooms = r.bathrooms();
    p.nightlyPrice = r.nightlyPrice().setScale(3);
    p.cleaningFee = r.cleaningFee().setScale(3);
    p.serviceFee = r.serviceFee().setScale(3);
    p.status = r.status();
  }
}
