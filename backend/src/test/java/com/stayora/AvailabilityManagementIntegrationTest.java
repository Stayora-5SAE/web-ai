package com.stayora;

import static org.assertj.core.api.Assertions.assertThat;

import com.stayora.availability.AvailabilityService;
import com.stayora.availability.HostAvailabilityManager;
import com.stayora.reservations.ReservationService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Sql(scripts = "/dev-seed.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_CLASS)
class AvailabilityManagementIntegrationTest {
  @Autowired TestRestTemplate http;
  @Autowired JdbcTemplate jdbc;
  private static final UUID PROPERTY = UUID.fromString("10000000-0000-0000-0000-000000000001");
  private static final UUID FOREIGN = UUID.fromString("10000000-0000-0000-0000-000000000003");
  private final LocalDate start = LocalDate.now().plusMonths(7).withDayOfMonth(5);

  @BeforeEach
  void resetOnlyDisposableDatabase() {
    assertThat(jdbc.queryForObject("select current_database()", String.class))
        .isEqualTo("stayora_test");
    jdbc.update("delete from stayora.messages");
    jdbc.update("delete from stayora.reservations");
    jdbc.update("delete from stayora.availability_blocks");
    jdbc.update("delete from stayora.nightly_prices");
  }

  @AfterEach
  void removePrices() {
    jdbc.update("delete from stayora.nightly_prices");
  }

  private <T> ResponseEntity<T> host(String path, HttpMethod method, Object body, Class<T> type) {
    HttpHeaders headers = new HttpHeaders();
    headers.set("X-Demo-Identity", "host");
    return http.exchange(path, method, new HttpEntity<>(body, headers), type);
  }

  private HostAvailabilityManager.BlockRequest block(
      UUID property, LocalDate from, LocalDate until) {
    return new HostAvailabilityManager.BlockRequest(property, from, until, "Maintenance");
  }

  private HostAvailabilityManager.PriceRequest price(UUID property, LocalDate date, String amount) {
    return new HostAvailabilityManager.PriceRequest(property, date, new BigDecimal(amount));
  }

  @Test
  void blockCrudAndExclusiveEndDate() {
    var created =
        host(
            "/api/host/availability/blocks",
            HttpMethod.POST,
            block(PROPERTY, start, start.plusDays(2)),
            AvailabilityService.BlockView.class);
    assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    UUID id = created.getBody().id();
    assertThat(
            host(
                    "/api/host/availability/blocks",
                    HttpMethod.POST,
                    block(PROPERTY, start.plusDays(1), start.plusDays(3)),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
    assertThat(
            host(
                    "/api/host/availability/blocks",
                    HttpMethod.POST,
                    block(PROPERTY, start.plusDays(2), start.plusDays(3)),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.CREATED);
    assertThat(
            host(
                    "/api/host/availability/blocks/" + id,
                    HttpMethod.PUT,
                    block(PROPERTY, start.minusDays(1), start.plusDays(2)),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.OK);
    assertThat(
            host("/api/host/calendar?propertyId=" + PROPERTY, HttpMethod.GET, null, String.class)
                .getBody())
        .contains(id.toString(), "Maintenance");
    assertThat(
            host("/api/host/availability/blocks/" + id, HttpMethod.DELETE, null, String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.NO_CONTENT);
    assertThat(
            jdbc.queryForObject(
                "select count(*) from stayora.availability_blocks where id=?", Integer.class, id))
        .isZero();
  }

  @Test
  void rejectsInvalidDatesPricesAndForeignOwnership() {
    assertThat(
            host(
                    "/api/host/availability/blocks",
                    HttpMethod.POST,
                    block(PROPERTY, start, start),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(
            host(
                    "/api/host/availability/blocks",
                    HttpMethod.POST,
                    block(PROPERTY, LocalDate.now().minusDays(1), start),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(
            host(
                    "/api/host/availability/blocks",
                    HttpMethod.POST,
                    block(FOREIGN, start, start.plusDays(1)),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    for (String amount : List.of("0", "-1", "0.0001", "100001"))
      assertThat(
              host(
                      "/api/host/availability/prices",
                      HttpMethod.POST,
                      price(PROPERTY, start, amount),
                      String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(
            host(
                    "/api/host/availability/prices",
                    HttpMethod.POST,
                    price(FOREIGN, start, "100"),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(
            http.postForEntity(
                    "/api/host/availability/blocks",
                    block(PROPERTY, start, start.plusDays(1)),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  void nightlyOverrideFeedsAuthoritativeQuoteAndCrud() {
    var created =
        host(
            "/api/host/availability/prices",
            HttpMethod.POST,
            price(PROPERTY, start.plusDays(1), "200.125"),
            AvailabilityService.PriceView.class);
    assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    UUID id = created.getBody().id();
    var request = new ReservationService.BookingRequest(PROPERTY, start, start.plusDays(3), 2);
    var quote =
        http.postForEntity("/api/reservations/quote", request, ReservationService.Quote.class)
            .getBody();
    assertThat(quote.subtotal()).isEqualByComparingTo("520.125");
    assertThat(quote.total()).isEqualByComparingTo("580.125");
    assertThat(
            host(
                    "/api/host/availability/prices",
                    HttpMethod.POST,
                    price(PROPERTY, start.plusDays(1), "250"),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
    assertThat(
            host(
                    "/api/host/availability/prices/" + id,
                    HttpMethod.PUT,
                    price(PROPERTY, start.plusDays(1), "201.125"),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.OK);
    assertThat(
            host("/api/host/availability/prices/" + id, HttpMethod.DELETE, null, String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.NO_CONTENT);
    assertThat(
            http.postForEntity("/api/reservations/quote", request, ReservationService.Quote.class)
                .getBody()
                .total())
        .isEqualByComparingTo("540.000");
  }

  @Test
  void activeBookingsPreventBlocksAndPriceMutations() {
    var request = new ReservationService.BookingRequest(PROPERTY, start, start.plusDays(3), 2);
    assertThat(http.postForEntity("/api/reservations", request, String.class).getStatusCode())
        .isEqualTo(HttpStatus.CREATED);
    assertThat(
            host(
                    "/api/host/availability/blocks",
                    HttpMethod.POST,
                    block(PROPERTY, start, start.plusDays(1)),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
    assertThat(
            host(
                    "/api/host/availability/prices",
                    HttpMethod.POST,
                    price(PROPERTY, start, "200"),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
  }

  @Test
  void concurrentBlockAndReservationCannotBothWin() throws Exception {
    CountDownLatch ready = new CountDownLatch(2), go = new CountDownLatch(1);
    java.util.function.Supplier<HttpStatus> owner =
        () -> {
          await(ready, go);
          return HttpStatus.valueOf(
              host(
                      "/api/host/availability/blocks",
                      HttpMethod.POST,
                      block(PROPERTY, start, start.plusDays(3)),
                      String.class)
                  .getStatusCode()
                  .value());
        };
    java.util.function.Supplier<HttpStatus> guest =
        () -> {
          await(ready, go);
          return HttpStatus.valueOf(
              http.postForEntity(
                      "/api/reservations",
                      new ReservationService.BookingRequest(PROPERTY, start, start.plusDays(3), 2),
                      String.class)
                  .getStatusCode()
                  .value());
        };
    var a = CompletableFuture.supplyAsync(owner);
    var b = CompletableFuture.supplyAsync(guest);
    assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
    go.countDown();
    assertThat(List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS)))
        .containsExactlyInAnyOrder(HttpStatus.CREATED, HttpStatus.CONFLICT);
  }

  private void await(CountDownLatch ready, CountDownLatch go) {
    ready.countDown();
    try {
      if (!go.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Start latch timed out");
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException(error);
    }
  }

  @Test
  void dashboardUsesSellableNightsAndDeterministicAggregateAi() {
    LocalDate first = start.withDayOfMonth(1);
    host(
        "/api/host/availability/blocks",
        HttpMethod.POST,
        block(PROPERTY, first, first.plusDays(2)),
        String.class);
    var body =
        host(
                "/api/host/dashboard?month=" + java.time.YearMonth.from(start),
                HttpMethod.GET,
                null,
                Map.class)
            .getBody();
    assertThat(((Number) body.get("blockedNights")).longValue()).isEqualTo(2);
    assertThat(((Number) body.get("sellableNights")).longValue())
        .isEqualTo(2L * start.lengthOfMonth() - 2);
    Map<String, String> prompt =
        Map.of(
            "skill",
            "host-summary",
            "context",
            "publishedProperties=2; occupancyPercent=0; pendingRequests=0");
    String response = http.postForEntity("/api/ai/assist", prompt, String.class).getBody();
    assertThat(response).contains("mock", "human review");
    assertThat(http.postForEntity("/api/ai/assist", prompt, String.class).getBody())
        .isEqualTo(response);
  }
}
