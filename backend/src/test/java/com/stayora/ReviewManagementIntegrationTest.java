package com.stayora;

import static org.assertj.core.api.Assertions.assertThat;

import com.stayora.reviews.ReviewAiSkill;
import com.stayora.reviews.ReviewService.PropertyReviews;
import com.stayora.reviews.ReviewService.Reputation;
import com.stayora.reviews.ReviewService.ReviewView;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Sql(scripts = "/dev-seed.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_CLASS)
class ReviewManagementIntegrationTest {
  @Autowired TestRestTemplate http;
  @Autowired JdbcTemplate jdbc;
  private static final UUID PROPERTY = UUID.fromString("10000000-0000-0000-0000-000000000001");
  private UUID stay;

  @BeforeEach
  void prepareIsolatedCompletedStay() {
    assertThat(jdbc.queryForObject("select current_database()", String.class))
        .isEqualTo("stayora_test");
    jdbc.update("delete from stayora.reviews");
    stay =
        insertStay(
            "CONFIRMED", LocalDate.now().minusDays(2), "00000000-0000-0000-0000-000000000001");
  }

  @AfterEach
  void cleanReviewsAndRestoreDerivedRating() {
    jdbc.update("delete from stayora.reviews");
    jdbc.update("update stayora.properties set rating=0, review_count=0 where id=?", PROPERTY);
  }

  private UUID insertStay(String status, LocalDate checkOut, String guest) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "insert into stayora.reservations(id,property_id,guest_id,check_in,check_out,guests,nightly_price,subtotal,cleaning_fee,service_fee,total,status,payment_status,created_at) values(?,?,?, ?,?,2,160,480,35,25,540,?,'SIMULATED',CURRENT_TIMESTAMP)",
        id,
        PROPERTY,
        UUID.fromString(guest),
        checkOut.minusDays(3),
        checkOut,
        status);
    return id;
  }

  private Map<String, Object> review(UUID reservation, int rating, String body) {
    return Map.of("reservationId", reservation, "rating", rating, "body", body);
  }

  private ResponseEntity<ReviewView> create(UUID reservation, int rating) {
    return http.postForEntity(
        "/api/reviews",
        review(reservation, rating, "A comfortable and welcoming stay."),
        ReviewView.class);
  }

  @Test
  void completedGuestCanCreateEditDeleteAndRatingsAreRecalculated() {
    var created = create(stay, 5);
    assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    UUID reviewId = created.getBody().id();
    var summary =
        http.getForObject("/api/properties/" + PROPERTY + "/reviews", PropertyReviews.class);
    assertThat(summary.reviewCount()).isEqualTo(1);
    assertThat(summary.rating()).isEqualByComparingTo("5.00");
    assertThat(
            jdbc.queryForObject(
                "select rating from stayora.properties where id=?",
                java.math.BigDecimal.class,
                PROPERTY))
        .isEqualByComparingTo("5.00");
    var updated =
        http.exchange(
            "/api/reviews/" + reviewId,
            HttpMethod.PUT,
            new HttpEntity<>(Map.of("rating", 3, "body", "An updated honest review of this stay.")),
            ReviewView.class);
    assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(updated.getBody().rating()).isEqualTo(3);
    var removed =
        http.exchange(
            "/api/reviews/" + reviewId, HttpMethod.DELETE, HttpEntity.EMPTY, String.class);
    assertThat(removed.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    assertThat(
            jdbc.queryForObject(
                "select review_count from stayora.properties where id=?", Integer.class, PROPERTY))
        .isZero();
    assertThat(
            jdbc.queryForObject(
                "select rating from stayora.properties where id=?",
                java.math.BigDecimal.class,
                PROPERTY))
        .isEqualByComparingTo("0.00");
  }

  @Test
  void rejectsInvalidRatingsAndWhitespaceBodies() {
    for (int stars : List.of(0, 6)) {
      assertThat(
              http.postForEntity(
                      "/api/reviews", review(stay, stars, "A useful honest review."), String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }
    for (String body : List.of("short", "             ", "x".repeat(2001))) {
      assertThat(
              http.postForEntity("/api/reviews", review(stay, 5, body), String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }
  }

  @Test
  void rejectsUncompletedPendingCancelledAndForeignStays() {
    for (String status : List.of("PENDING", "DECLINED", "CANCELLED")) {
      UUID id =
          insertStay(status, LocalDate.now().minusDays(1), "00000000-0000-0000-0000-000000000001");
      assertThat(
              http.postForEntity(
                      "/api/reviews", review(id, 5, "A useful honest review."), String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.FORBIDDEN);
    }
    UUID future =
        insertStay(
            "CONFIRMED", LocalDate.now().plusDays(5), "00000000-0000-0000-0000-000000000001");
    assertThat(
            http.postForEntity(
                    "/api/reviews", review(future, 5, "A useful honest review."), String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    UUID foreign =
        insertStay(
            "CONFIRMED", LocalDate.now().minusDays(1), "00000000-0000-0000-0000-000000000003");
    assertThat(
            http.postForEntity(
                    "/api/reviews", review(foreign, 5, "A useful honest review."), String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  void duplicateIsConflictAndHostCannotWriteGuestReviews() {
    assertThat(create(stay, 4).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(
            http.postForEntity(
                    "/api/reviews", review(stay, 5, "A useful honest review."), String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
    HttpHeaders headers = new HttpHeaders();
    headers.set("X-Demo-Identity", "host");
    assertThat(
            http.exchange(
                    "/api/reviews",
                    HttpMethod.POST,
                    new HttpEntity<>(review(stay, 4, "A useful honest review."), headers),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  void foreignAuthorReviewCannotBeEditedOrDeleted() {
    UUID id = create(stay, 4).getBody().id();
    jdbc.update(
        "update stayora.reviews set author_id='00000000-0000-0000-0000-000000000003' where id=?",
        id);
    assertThat(
            http.exchange(
                    "/api/reviews/" + id,
                    HttpMethod.PUT,
                    new HttpEntity<>(Map.of("rating", 2, "body", "Changed by another guest.")),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(
            http.exchange("/api/reviews/" + id, HttpMethod.DELETE, HttpEntity.EMPTY, String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  void concurrentReviewsForOneStayCreateOnlyOneRow() throws Exception {
    CountDownLatch ready = new CountDownLatch(2);
    CountDownLatch release = new CountDownLatch(1);
    java.util.function.Supplier<HttpStatus> submit =
        () -> {
          ready.countDown();
          try {
            release.await(10, TimeUnit.SECONDS);
          } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
          }
          return HttpStatus.valueOf(
              http.postForEntity(
                      "/api/reviews", review(stay, 4, "A useful honest review."), String.class)
                  .getStatusCode()
                  .value());
        };
    var first = CompletableFuture.supplyAsync(submit);
    var second = CompletableFuture.supplyAsync(submit);
    assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
    release.countDown();
    assertThat(List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS)))
        .containsExactlyInAnyOrder(HttpStatus.CREATED, HttpStatus.CONFLICT);
    assertThat(
            jdbc.queryForObject(
                "select count(*) from stayora.reviews where reservation_id=?", Integer.class, stay))
        .isEqualTo(1);
  }

  @Test
  void averageUsesDecimalRoundingAndCompletedStaysDisappearAfterReview() {
    assertThat(http.getForObject("/api/reviews/eligible", String.class)).contains(stay.toString());
    create(stay, 5);
    UUID second =
        insertStay(
            "CONFIRMED", LocalDate.now().minusDays(12), "00000000-0000-0000-0000-000000000001");
    create(second, 2);
    var summary =
        http.getForObject("/api/properties/" + PROPERTY + "/reviews", PropertyReviews.class);
    assertThat(summary.rating()).isEqualByComparingTo("3.50");
    assertThat(summary.reviewCount()).isEqualTo(2);
    assertThat(http.getForObject("/api/reviews/eligible", String.class))
        .doesNotContain(stay.toString());
  }

  @Test
  void reviewAssistantIsDeterministicAndClearlyMocked() {
    var skill = new ReviewAiSkill();
    assertThat(skill.mock("count=2; average=4.50"))
        .isEqualTo(skill.mock("count=2; average=4.50"))
        .contains("mock", "Small samples");
    assertThat(skill.owner()).isEqualTo("Wassim Hamouda");
    assertThat(skill.systemPrompt()).contains("never invent", "human review");
  }

  private HttpEntity<?> host(Object body) {
    HttpHeaders headers = new HttpHeaders();
    headers.set("X-Demo-Identity", "host");
    return new HttpEntity<>(body, headers);
  }

  @Test
  void bothSidesReviewSameStayAndGuestRatingsNeverChangePropertyRating() {
    assertThat(create(stay, 5).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    var written =
        http.exchange(
            "/api/host/reviews",
            HttpMethod.POST,
            host(review(stay, 2, "The guest left the space untidy.")),
            ReviewView.class);
    assertThat(written.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(written.getBody().direction()).isEqualTo("GUEST");
    assertThat(written.getBody().subjectId())
        .isEqualTo(UUID.fromString("00000000-0000-0000-0000-000000000001"));
    assertThat(written.getBody().tags()).isEmpty();
    assertThat(http.getForObject("/api/reviews/received", Reputation.class).rating())
        .isEqualByComparingTo("2.00");
    var property =
        http.getForObject("/api/properties/" + PROPERTY + "/reviews", PropertyReviews.class);
    assertThat(property.rating()).isEqualByComparingTo("5.00");
    assertThat(property.reviewCount()).isEqualTo(1);
    assertThat(
            http.exchange(
                    "/api/host/reviews",
                    HttpMethod.POST,
                    host(review(stay, 4, "Another review for the same guest.")),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
    assertThat(
            http.exchange(
                    "/api/reviews/" + written.getBody().id(),
                    HttpMethod.PUT,
                    new HttpEntity<>(
                        Map.of("rating", 5, "body", "A guest trying to change their rating.")),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(
            http.exchange(
                    "/api/reviews/" + written.getBody().id(),
                    HttpMethod.PUT,
                    host(Map.of("rating", 4, "body", "Updated guest experience after hosting.")),
                    ReviewView.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.OK);
    assertThat(http.getForObject("/api/reviews/received", Reputation.class).rating())
        .isEqualByComparingTo("4.00");
    assertThat(
            http.exchange(
                    "/api/reviews/" + written.getBody().id(),
                    HttpMethod.DELETE,
                    host(null),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.NO_CONTENT);
    assertThat(http.getForObject("/api/reviews/received", Reputation.class).reviewCount()).isZero();
  }

  @Test
  void hostTagCountsFollowCreateEditDeleteAndRejectConflictingOrUnknownTags() {
    for (var tags :
        List.of(
            List.of("clean", "needs-cleaning"), List.of("unknown"), List.of("clean", "clean"))) {
      assertThat(
              http.postForEntity(
                      "/api/reviews",
                      Map.of(
                          "reservationId",
                          stay,
                          "rating",
                          5,
                          "body",
                          "A comfortable and welcoming stay.",
                          "tags",
                          tags),
                      String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }
    var first =
        http.postForEntity(
                "/api/reviews",
                Map.of(
                    "reservationId",
                    stay,
                    "rating",
                    5,
                    "body",
                    "A comfortable and welcoming stay.",
                    "tags",
                    List.of("clean", "responsive")),
                ReviewView.class)
            .getBody();
    UUID second =
        insertStay(
            "CONFIRMED", LocalDate.now().minusDays(8), "00000000-0000-0000-0000-000000000001");
    http.postForEntity(
        "/api/reviews",
        Map.of(
            "reservationId",
            second,
            "rating",
            4,
            "body",
            "Another clean and comfortable stay.",
            "tags",
            List.of("clean")),
        ReviewView.class);
    var reputation =
        http.exchange("/api/host/reviews", HttpMethod.GET, host(null), Reputation.class).getBody();
    assertThat(
            reputation.tags().stream()
                .filter(t -> t.id().equals("clean"))
                .findFirst()
                .orElseThrow()
                .count())
        .isEqualTo(2);
    http.exchange(
        "/api/reviews/" + first.id(),
        HttpMethod.PUT,
        new HttpEntity<>(
            Map.of(
                "rating",
                2,
                "body",
                "The room needed more cleaning.",
                "tags",
                List.of("needs-cleaning"))),
        ReviewView.class);
    var property =
        http.getForObject("/api/properties/" + PROPERTY + "/reviews", PropertyReviews.class);
    assertThat(property.tags())
        .extracting(t -> t.id())
        .containsExactlyInAnyOrder("clean", "needs-cleaning");
    http.exchange("/api/reviews/" + first.id(), HttpMethod.DELETE, HttpEntity.EMPTY, String.class);
    property = http.getForObject("/api/properties/" + PROPERTY + "/reviews", PropertyReviews.class);
    assertThat(property.tags()).extracting(t -> t.id()).containsExactly("clean");
  }

  @Test
  void hostReviewsRequireOwnedCompletedConfirmedStayAndCannotCarryTags() {
    jdbc.update(
        "update stayora.properties set host_id='00000000-0000-0000-0000-000000000003' where id=?",
        PROPERTY);
    try {
      assertThat(
              http.exchange(
                      "/api/host/reviews",
                      HttpMethod.POST,
                      host(review(stay, 5, "A polite and respectful guest.")),
                      String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.FORBIDDEN);
    } finally {
      jdbc.update(
          "update stayora.properties set host_id='00000000-0000-0000-0000-000000000002' where id=?",
          PROPERTY);
    }
    for (String status : List.of("PENDING", "DECLINED", "CANCELLED")) {
      UUID id =
          insertStay(status, LocalDate.now().minusDays(1), "00000000-0000-0000-0000-000000000001");
      assertThat(
              http.exchange(
                      "/api/host/reviews",
                      HttpMethod.POST,
                      host(review(id, 5, "A polite and respectful guest.")),
                      String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.FORBIDDEN);
    }
    UUID future =
        insertStay(
            "CONFIRMED", LocalDate.now().plusDays(5), "00000000-0000-0000-0000-000000000001");
    assertThat(
            http.exchange(
                    "/api/host/reviews",
                    HttpMethod.POST,
                    host(review(future, 5, "A polite and respectful guest.")),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(
            http.exchange(
                    "/api/host/reviews",
                    HttpMethod.POST,
                    host(
                        Map.of(
                            "reservationId",
                            stay,
                            "rating",
                            4,
                            "body",
                            "A polite and respectful guest.",
                            "tags",
                            List.of("clean"))),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(
            http.exchange(
                    "/api/host/guests/" + UUID.randomUUID() + "/reviews",
                    HttpMethod.GET,
                    host(null),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
  }
}
