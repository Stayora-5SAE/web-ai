package com.stayora;

import static org.assertj.core.api.Assertions.assertThat;

import com.stayora.reservations.ReservationService.BookingRequest;
import com.stayora.reservations.ReservationService.Quote;
import com.stayora.reservations.ReservationService.ReservationView;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
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
class BookingIntegrationTest {
  @Autowired TestRestTemplate http;
  @Autowired JdbcTemplate jdbc;
  private static final UUID PROPERTY = UUID.fromString("10000000-0000-0000-0000-000000000001");
  private final LocalDate start = LocalDate.now().plusMonths(4).withDayOfMonth(5);

  @BeforeEach
  void cleanOnlyTestDatabase() {
    assertThat(jdbc.queryForObject("select current_database()", String.class))
        .isEqualTo("stayora_test");
    jdbc.update("delete from stayora.messages");
    jdbc.update("delete from stayora.reservations");
    jdbc.update("delete from stayora.availability_blocks");
  }

  private BookingRequest request() {
    return new BookingRequest(PROPERTY, start, start.plusDays(3), 2);
  }

  private <T> ResponseEntity<T> post(String path, Object body, Class<T> type) {
    return http.postForEntity(path, body, type);
  }

  private ResponseEntity<ReservationView> create(BookingRequest request) {
    return post("/api/reservations", request, ReservationView.class);
  }

  private ResponseEntity<String> decision(UUID id, String status, String identity) {
    HttpHeaders headers = new HttpHeaders();
    headers.set("X-Demo-Identity", identity);
    // TestRestTemplate's default client does not support PATCH; use the configured Apache client
    // below.
    return http.exchange(
        "/api/host/reservations/" + id + "/status",
        HttpMethod.PATCH,
        new HttpEntity<>(Map.of("status", status), headers),
        String.class);
  }

  @Test
  void quotesUseDecimalArithmeticAndIgnoreClientPrice() {
    Quote q = post("/api/reservations/quote", request(), Quote.class).getBody();
    assertThat(q).isNotNull();
    assertThat(q.subtotal()).isEqualByComparingTo("480.000");
    assertThat(q.cleaningFee()).isEqualByComparingTo("35.000");
    assertThat(q.serviceFee()).isEqualByComparingTo("25.000");
    assertThat(q.total()).isEqualByComparingTo("540.000");
    jdbc.update("update stayora.properties set nightly_price=160.125 where id=?", PROPERTY);
    try {
      Quote decimal = post("/api/reservations/quote", request(), Quote.class).getBody();
      assertThat(decimal.total()).isEqualByComparingTo(new BigDecimal("540.375"));
    } finally {
      jdbc.update("update stayora.properties set nightly_price=160 where id=?", PROPERTY);
    }
    Map<String, Object> forged =
        Map.of(
            "propertyId",
            PROPERTY,
            "checkIn",
            start,
            "checkOut",
            start.plusDays(3),
            "guests",
            2,
            "total",
            1);
    ReservationView reservation =
        post("/api/reservations", forged, ReservationView.class).getBody();
    assertThat(reservation.total()).isEqualByComparingTo("540.000");
    assertThat(reservation.paymentStatus()).isEqualTo("SIMULATED");
  }

  @Test
  void rejectsInvalidDatesCapacityAndDrafts() {
    for (BookingRequest invalid :
        List.of(
            new BookingRequest(PROPERTY, start, start, 2),
                new BookingRequest(PROPERTY, start, start.minusDays(1), 2),
            new BookingRequest(PROPERTY, LocalDate.now().minusDays(1), start, 2),
                new BookingRequest(PROPERTY, start, start.plusDays(91), 2),
            new BookingRequest(PROPERTY, start, start.plusDays(3), 3),
                new BookingRequest(PROPERTY, start, start.plusDays(3), 0))) {
      assertThat(post("/api/reservations/quote", invalid, String.class).getStatusCode())
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }
    BookingRequest draft =
        new BookingRequest(
            UUID.fromString("10000000-0000-0000-0000-000000000008"), start, start.plusDays(3), 2);
    assertThat(post("/api/reservations/quote", draft, String.class).getStatusCode())
        .isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  void pendingHoldsDatesAndAdjacentStaysRemainAvailable() {
    assertThat(create(request()).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(post("/api/reservations", request(), String.class).getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
    BookingRequest adjacent = new BookingRequest(PROPERTY, start.plusDays(3), start.plusDays(5), 2);
    assertThat(create(adjacent).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(
            http.getForEntity(
                    "/api/properties?checkIn=" + start + "&checkOut=" + start.plusDays(3),
                    String.class)
                .getBody())
        .doesNotContain(PROPERTY.toString());
  }

  @Test
  void ownerBlocksPreventReservations() {
    jdbc.update(
        "insert into stayora.availability_blocks values (? ,?, ?, ?, 'Test block')",
        UUID.randomUUID(),
        PROPERTY,
        start,
        start.plusDays(1));
    assertThat(post("/api/reservations/quote", request(), String.class).getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
  }

  @Test
  void hostDecisionPersistsAndDeclineReleasesDates() {
    ReservationView r = create(request()).getBody();
    assertThat(decision(r.id(), "CONFIRMED", "host").getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(
            jdbc.queryForObject(
                "select status from stayora.reservations where id=?", String.class, r.id()))
        .isEqualTo("CONFIRMED");
    assertThat(decision(r.id(), "DECLINED", "host").getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    jdbc.update("delete from stayora.reservations");
    r = create(request()).getBody();
    assertThat(decision(r.id(), "DECLINED", "host").getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(create(request()).getStatusCode()).isEqualTo(HttpStatus.CREATED);
  }

  @Test
  void preventsGuestHostAndOwnershipSpoofing() {
    ReservationView r = create(request()).getBody();
    assertThat(decision(r.id(), "CONFIRMED", "guest").getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(decision(r.id(), "CONFIRMED", "administrator").getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    BookingRequest other =
        new BookingRequest(
            UUID.fromString("10000000-0000-0000-0000-000000000003"), start, start.plusDays(2), 2);
    ReservationView foreign = create(other).getBody();
    assertThat(decision(foreign.id(), "CONFIRMED", "host").getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    HttpHeaders headers = new HttpHeaders();
    headers.set("X-Demo-Identity", "host");
    assertThat(
            http.exchange(
                    "/api/reservations",
                    HttpMethod.POST,
                    new HttpEntity<>(request(), headers),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(http.getForEntity("/api/host/listings", String.class).getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  void serializesConcurrentReservations() throws Exception {
    CountDownLatch ready = new CountDownLatch(2), go = new CountDownLatch(1);
    java.util.function.Supplier<HttpStatus> book =
        () -> {
          ready.countDown();
          try {
            go.await(5, TimeUnit.SECONDS);
          } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
          }
          return HttpStatus.valueOf(
              post("/api/reservations", request(), String.class).getStatusCode().value());
        };
    CompletableFuture<HttpStatus> a = CompletableFuture.supplyAsync(book),
        b = CompletableFuture.supplyAsync(book);
    assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
    go.countDown();
    assertThat(List.of(a.get(15, TimeUnit.SECONDS), b.get(15, TimeUnit.SECONDS)))
        .containsExactlyInAnyOrder(HttpStatus.CREATED, HttpStatus.CONFLICT);
    assertThat(jdbc.queryForObject("select count(*) from stayora.reservations", Integer.class))
        .isEqualTo(1);
  }

  @Test
  void returnsConsistentErrorsAndMockAi() {
    assertThat(
            post("/api/reservations/quote", Map.of("propertyId", "invalid"), String.class)
                .getBody())
        .contains("message", "status");
    assertThat(http.getForEntity("/api/properties?checkIn=" + start, String.class).getStatusCode())
        .isEqualTo(HttpStatus.BAD_REQUEST);
    Map<String, String> prompt = Map.of("skill", "listing-description", "context", "La Marsa");
    String response = post("/api/ai/assist", prompt, String.class).getBody();
    assertThat(response).contains("mock", "La Marsa");
    assertThat(post("/api/ai/assist", prompt, String.class).getBody()).isEqualTo(response);
    assertThat(
            post("/api/ai/assist", Map.of("skill", "missing", "context", "demo"), String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void seedIsRepeatableAndDoesNotOverwrite() throws Exception {
    jdbc.update(
        "update stayora.accounts set name='Contributor edit' where id='00000000-0000-0000-0000-000000000001'");
    try (var connection = jdbc.getDataSource().getConnection()) {
      org.springframework.jdbc.datasource.init.ScriptUtils.executeSqlScript(
          connection, new org.springframework.core.io.ClassPathResource("dev-seed.sql"));
    }
    assertThat(jdbc.queryForObject("select count(*) from stayora.properties", Integer.class))
        .isEqualTo(8);
    assertThat(
            jdbc.queryForObject(
                "select name from stayora.accounts where id='00000000-0000-0000-0000-000000000001'",
                String.class))
        .isEqualTo("Contributor edit");
    jdbc.update(
        "update stayora.accounts set name='Sami Ben Ali' where id='00000000-0000-0000-0000-000000000001'");
  }
}
