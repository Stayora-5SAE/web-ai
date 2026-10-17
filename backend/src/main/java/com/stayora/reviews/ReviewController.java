package com.stayora.reviews;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
class ReviewController {
  private final ReviewService reviews;

  ReviewController(ReviewService reviews) {
    this.reviews = reviews;
  }

  @GetMapping("/properties/{id}/reviews")
  ReviewService.PropertyReviews property(@PathVariable UUID id) {
    return reviews.forProperty(id);
  }

  @GetMapping("/reviews/mine")
  List<ReviewService.ReviewView> mine() {
    return reviews.mine();
  }

  @GetMapping("/reviews/eligible")
  List<ReviewService.EligibleStay> eligible() {
    return reviews.eligible();
  }

  @GetMapping("/reviews/tags")
  List<ReviewService.ReviewTag> tags() {
    return ReviewService.TAGS;
  }

  @GetMapping("/host/reviews")
  ReviewService.Reputation performance() {
    return reviews.hostPerformance();
  }

  @GetMapping("/reviews/received")
  ReviewService.Reputation received() {
    return reviews.received();
  }

  @GetMapping("/host/guests/{id}/reviews")
  ReviewService.Reputation guest(@PathVariable UUID id) {
    return reviews.guestReputation(id);
  }

  @GetMapping("/host/reviews/eligible")
  List<ReviewService.EligibleStay> hostEligible() {
    return reviews.eligible(true);
  }

  @PostMapping("/host/reviews")
  @ResponseStatus(HttpStatus.CREATED)
  ReviewService.ReviewView guestReview(@Valid @RequestBody ReviewService.CreateReview request) {
    return reviews.createGuestReview(request);
  }

  @PostMapping("/reviews")
  @ResponseStatus(HttpStatus.CREATED)
  ReviewService.ReviewView create(@Valid @RequestBody ReviewService.CreateReview request) {
    return reviews.create(request);
  }

  @PutMapping("/reviews/{id}")
  ReviewService.ReviewView update(
      @PathVariable UUID id, @Valid @RequestBody ReviewService.EditReview request) {
    return reviews.update(id, request);
  }

  @DeleteMapping("/reviews/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void delete(@PathVariable UUID id) {
    reviews.delete(id);
  }
}
