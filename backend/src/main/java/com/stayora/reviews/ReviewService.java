package com.stayora.reviews;

import com.stayora.accounts.AccountService;
import com.stayora.listings.ListingService;
import com.stayora.reservations.ReservationService;
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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewService {
  private final ReviewRepository reviews;
  private final ListingService listings;
  private final ReservationService reservations;
  private final AccountService accounts;
  @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;

  public ReviewService(
      ReviewRepository reviews,
      ListingService listings,
      ReservationService reservations,
      AccountService accounts) {
    this.reviews = reviews;
    this.listings = listings;
    this.reservations = reservations;
    this.accounts = accounts;
  }

  public PropertyReviews forProperty(UUID propertyId) {
    var property = listings.get(propertyId);
    if (!"PUBLISHED".equals(property.status())) throw ApiException.notFound();
    List<Review> rows =
        reviews.findByPropertyIdAndDirectionOrderByCreatedAtDesc(propertyId, "STAY");
    return new PropertyReviews(
        propertyId,
        average(rows),
        rows.size(),
        rows.stream().map(this::view).toList(),
        tagCounts(rows));
  }

  public List<ReviewView> mine() {
    return reviews.findByAuthorIdOrderByCreatedAtDesc(accounts.current().id()).stream()
        .map(this::view)
        .toList();
  }

  public List<EligibleStay> eligible() {
    return eligible(false);
  }

  public List<EligibleStay> eligible(boolean host) {
    accounts.requireRole(host ? "HOST" : "GUEST");
    return (host ? reservations.hostRequests() : reservations.trips())
        .stream()
            .filter(
                r ->
                    "CONFIRMED".equals(r.status())
                        && !r.checkOut().isAfter(LocalDate.now())
                        && !reviews.existsByReservationIdAndDirection(
                            r.id(), host ? "GUEST" : "STAY"))
            .map(
                r ->
                    new EligibleStay(
                        r.id(),
                        r.propertyId(),
                        r.propertyTitle(),
                        r.image(),
                        r.checkIn(),
                        r.checkOut(),
                        r.guest().name()))
            .toList();
  }

  @Transactional
  public ReviewView create(CreateReview request) {
    return createDirected(request, false);
  }

  @Transactional
  public ReviewView createGuestReview(CreateReview request) {
    return createDirected(request, true);
  }

  private ReviewView createDirected(CreateReview request, boolean host) {
    UUID author = accounts.requireRole(host ? "HOST" : "GUEST").id();
    var stay = reservations.get(request.reservationId());
    var property = listings.lock(stay.propertyId());
    if (!"CONFIRMED".equals(stay.status())
        || stay.checkOut().isAfter(LocalDate.now())
        || !(host ? property.hostId() : stay.guest().id()).equals(author))
      throw ApiException.forbidden();
    String direction = host ? "GUEST" : "STAY";
    if (reviews.existsByReservationIdAndDirection(stay.id(), direction))
      throw ApiException.conflict("This stay already has a review. Edit your existing review.");
    Review review = new Review();
    review.id = UUID.randomUUID();
    review.propertyId = stay.propertyId();
    review.authorId = author;
    review.reservationId = stay.id();
    review.direction = direction;
    review.subjectId = host ? stay.guest().id() : property.hostId();
    review.tags = validatedTags(request.tags(), direction);
    review.rating = request.rating();
    review.body = validatedBody(request.body());
    review.createdAt = Instant.now();
    review.updatedAt = review.createdAt;
    reviews.saveAndFlush(review);
    if (!host) refreshRating(review.propertyId);
    return view(review);
  }

  @Transactional
  public ReviewView update(UUID id, EditReview request) {
    Review review = owned(id);
    listings.lock(review.propertyId);
    refreshLockedReview(review);
    review.rating = request.rating();
    review.body = validatedBody(request.body());
    review.tags = validatedTags(request.tags(), review.direction);
    review.updatedAt = Instant.now();
    reviews.saveAndFlush(review);
    if ("STAY".equals(review.direction)) refreshRating(review.propertyId);
    return view(review);
  }

  @Transactional
  public void delete(UUID id) {
    Review review = owned(id);
    listings.lock(review.propertyId);
    refreshLockedReview(review);
    reviews.delete(review);
    reviews.flush();
    if ("STAY".equals(review.direction)) refreshRating(review.propertyId);
  }

  private Review owned(UUID id) {
    UUID author = accounts.current().id();
    Review review = reviews.findById(id).orElseThrow(ApiException::notFound);
    if (!review.authorId.equals(author)) throw ApiException.forbidden();
    return review;
  }

  private void refreshLockedReview(Review review) {
    try {
      entityManager.refresh(review);
    } catch (jakarta.persistence.EntityNotFoundException e) {
      throw ApiException.notFound();
    }
  }

  private String validatedBody(String body) {
    if (body == null || body.trim().length() < 10 || body.trim().length() > 2000)
      throw ApiException.badRequest("Write a review between 10 and 2,000 characters.");
    return body.trim();
  }

  private void refreshRating(UUID propertyId) {
    List<Review> rows =
        reviews.findByPropertyIdAndDirectionOrderByCreatedAtDesc(propertyId, "STAY");
    listings.updateRating(propertyId, average(rows), rows.size());
  }

  private BigDecimal average(List<Review> rows) {
    if (rows.isEmpty()) return BigDecimal.ZERO.setScale(2);
    return BigDecimal.valueOf(rows.stream().mapToInt(r -> r.rating).sum())
        .divide(BigDecimal.valueOf(rows.size()), 2, RoundingMode.HALF_UP);
  }

  private ReviewView view(Review r) {
    return new ReviewView(
        r.id,
        r.propertyId,
        r.authorId,
        accounts.get(r.authorId).name(),
        r.reservationId,
        r.rating,
        r.body,
        r.createdAt,
        r.updatedAt,
        r.direction,
        r.subjectId,
        accounts.get(r.subjectId).name(),
        listings.get(r.propertyId).title(),
        tagsOf(r),
        TAGS.stream().filter(t -> tagsOf(r).contains(t.id())).toList());
  }

  public Reputation hostPerformance() {
    return reputation(accounts.requireRole("HOST").id(), "STAY");
  }

  public Reputation received() {
    return reputation(accounts.requireRole("GUEST").id(), "GUEST");
  }

  public Reputation guestReputation(UUID guestId) {
    accounts.requireRole("HOST");
    if (reservations.hostRequests().stream().noneMatch(r -> r.guest().id().equals(guestId)))
      throw ApiException.forbidden();
    return reputation(guestId, "GUEST");
  }

  private Reputation reputation(UUID subjectId, String direction) {
    var rows = reviews.findBySubjectIdAndDirectionOrderByCreatedAtDesc(subjectId, direction);
    return new Reputation(
        average(rows),
        rows.size(),
        rows.stream().filter(r -> r.rating >= 4).count(),
        tagCounts(rows),
        rows.stream().map(this::view).toList());
  }

  public static final List<ReviewTag> TAGS =
      List.of(
          new ReviewTag("clean", "Clean", "GOOD", "cleanliness"),
          new ReviewTag("needs-cleaning", "Needs cleaning", "BAD", "cleanliness"),
          new ReviewTag("welcoming", "Welcoming host", "GOOD", "hospitality"),
          new ReviewTag("unwelcoming", "Unwelcoming", "BAD", "hospitality"),
          new ReviewTag("responsive", "Quick replies", "GOOD", "communication"),
          new ReviewTag("slow-replies", "Slow replies", "BAD", "communication"),
          new ReviewTag("easy-check-in", "Easy check-in", "GOOD", "check-in"),
          new ReviewTag("difficult-check-in", "Difficult check-in", "BAD", "check-in"),
          new ReviewTag("as-described", "As described", "GOOD", "accuracy"),
          new ReviewTag("not-as-described", "Not as described", "BAD", "accuracy"));

  private List<String> tagsOf(Review review) {
    return review.tags.isEmpty() ? List.of() : Arrays.asList(review.tags.split(","));
  }

  private String validatedTags(List<String> ids, String direction) {
    if (ids == null || ids.isEmpty()) return "";
    if (!"STAY".equals(direction) || ids.size() > 5)
      throw ApiException.badRequest("Choose up to five tags for a host review only.");
    var categories = new ArrayList<String>();
    for (String id : ids) {
      var tag =
          TAGS.stream()
              .filter(t -> t.id().equals(id))
              .findFirst()
              .orElseThrow(() -> ApiException.badRequest("Choose a supported review tag."));
      if (categories.contains(tag.category()))
        throw ApiException.badRequest("Choose one tag per category.");
      categories.add(tag.category());
    }
    return String.join(",", ids);
  }

  private List<TagCount> tagCounts(List<Review> rows) {
    return TAGS.stream()
        .map(
            t ->
                new TagCount(
                    t.id(),
                    t.label(),
                    t.sentiment(),
                    rows.stream().filter(r -> tagsOf(r).contains(t.id())).count()))
        .filter(t -> t.count() > 0)
        .sorted(java.util.Comparator.comparingLong(TagCount::count).reversed())
        .toList();
  }

  public record CreateReview(
      @NotNull UUID reservationId,
      @Min(1) @Max(5) int rating,
      @NotBlank @Size(min = 10, max = 2000) String body,
      @Size(max = 5) List<String> tags) {}

  public record EditReview(
      @Min(1) @Max(5) int rating,
      @NotBlank @Size(min = 10, max = 2000) String body,
      @Size(max = 5) List<String> tags) {}

  public record ReviewView(
      UUID id,
      UUID propertyId,
      UUID authorId,
      String authorName,
      UUID reservationId,
      int rating,
      String body,
      Instant createdAt,
      Instant updatedAt,
      String direction,
      UUID subjectId,
      String subjectName,
      String propertyTitle,
      List<String> tags,
      List<ReviewTag> tagDetails) {}

  public record PropertyReviews(
      UUID propertyId,
      BigDecimal rating,
      int reviewCount,
      List<ReviewView> reviews,
      List<TagCount> tags) {}

  public record ReviewTag(String id, String label, String sentiment, String category) {}

  public record TagCount(String id, String label, String sentiment, long count) {}

  public record Reputation(
      BigDecimal rating,
      int reviewCount,
      long positiveReviews,
      List<TagCount> tags,
      List<ReviewView> reviews) {}

  public record EligibleStay(
      UUID reservationId,
      UUID propertyId,
      String propertyTitle,
      String image,
      LocalDate checkIn,
      LocalDate checkOut,
      String guestName) {}
}
