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
    List<Review> rows = reviews.findByPropertyIdOrderByCreatedAtDesc(propertyId);
    return new PropertyReviews(
        propertyId, average(rows), rows.size(), rows.stream().map(this::view).toList());
  }

  public List<ReviewView> mine() {
    return reviews.findByAuthorIdOrderByCreatedAtDesc(accounts.requireRole("GUEST").id()).stream()
        .map(this::view)
        .toList();
  }

  public List<EligibleStay> eligible() {
    UUID guestId = accounts.requireRole("GUEST").id();
    return reservations.trips().stream()
        .filter(
            r ->
                reservations.eligibleForReview(r.id(), guestId)
                    && !reviews.existsByReservationId(r.id()))
        .map(
            r ->
                new EligibleStay(
                    r.id(),
                    r.propertyId(),
                    r.propertyTitle(),
                    r.image(),
                    r.checkIn(),
                    r.checkOut()))
        .toList();
  }

  @Transactional
  public ReviewView create(CreateReview request) {
    UUID author = accounts.requireRole("GUEST").id();
    var stay = reservations.get(request.reservationId());
    listings.lock(stay.propertyId());
    if (!reservations.eligibleForReview(stay.id(), author)) throw ApiException.forbidden();
    if (reviews.existsByReservationId(stay.id()))
      throw ApiException.conflict("This stay already has a review. Edit your existing review.");
    Review review = new Review();
    review.id = UUID.randomUUID();
    review.propertyId = stay.propertyId();
    review.authorId = author;
    review.reservationId = stay.id();
    review.rating = request.rating();
    review.body = validatedBody(request.body());
    review.createdAt = Instant.now();
    review.updatedAt = review.createdAt;
    reviews.saveAndFlush(review);
    refreshRating(review.propertyId);
    return view(review);
  }

  @Transactional
  public ReviewView update(UUID id, EditReview request) {
    Review review = owned(id);
    listings.lock(review.propertyId);
    refreshLockedReview(review);
    review.rating = request.rating();
    review.body = validatedBody(request.body());
    review.updatedAt = Instant.now();
    reviews.saveAndFlush(review);
    refreshRating(review.propertyId);
    return view(review);
  }

  @Transactional
  public void delete(UUID id) {
    Review review = owned(id);
    listings.lock(review.propertyId);
    refreshLockedReview(review);
    reviews.delete(review);
    reviews.flush();
    refreshRating(review.propertyId);
  }

  private Review owned(UUID id) {
    UUID author = accounts.requireRole("GUEST").id();
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
    List<Review> rows = reviews.findByPropertyIdOrderByCreatedAtDesc(propertyId);
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
        r.updatedAt);
  }

  public record CreateReview(
      @NotNull UUID reservationId,
      @Min(1) @Max(5) int rating,
      @NotBlank @Size(min = 10, max = 2000) String body) {}

  public record EditReview(
      @Min(1) @Max(5) int rating, @NotBlank @Size(min = 10, max = 2000) String body) {}

  public record ReviewView(
      UUID id,
      UUID propertyId,
      UUID authorId,
      String authorName,
      UUID reservationId,
      int rating,
      String body,
      Instant createdAt,
      Instant updatedAt) {}

  public record PropertyReviews(
      UUID propertyId, BigDecimal rating, int reviewCount, List<ReviewView> reviews) {}

  public record EligibleStay(
      UUID reservationId,
      UUID propertyId,
      String propertyTitle,
      String image,
      LocalDate checkIn,
      LocalDate checkOut) {}
}
