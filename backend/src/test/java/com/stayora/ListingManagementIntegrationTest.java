package com.stayora;

import static org.assertj.core.api.Assertions.assertThat;

import com.stayora.listings.ListingService.PropertyView;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
class ListingManagementIntegrationTest {
  @Autowired TestRestTemplate http;
  @Autowired JdbcTemplate jdbc;
  private final List<UUID> created = new ArrayList<>();

  @BeforeEach
  void assertDisposableDatabase() {
    assertThat(jdbc.queryForObject("select current_database()", String.class))
        .isEqualTo("stayora_test");
  }

  @AfterEach
  void cleanOwnPropertiesOnly() {
    for (UUID id : created) {
      jdbc.update(
          "delete from stayora.messages where reservation_id in (select id from stayora.reservations where property_id=?)",
          id);
      jdbc.update("delete from stayora.reviews where property_id=?", id);
      jdbc.update("delete from stayora.reservations where property_id=?", id);
      jdbc.update("delete from stayora.availability_blocks where property_id=?", id);
      jdbc.update("delete from stayora.properties where id=?", id);
    }
  }

  private Map<String, Object> payload(String status) {
    Map<String, Object> body = new HashMap<>();
    body.put("title", "Listing test courtyard");
    body.put("destination", "Test destination");
    body.put("category", "Houses");
    body.put("description", "A courtyard space with accurate details.");
    body.put("images", List.of("https://example.com/courtyard.jpg"));
    body.put("amenities", List.of("Wi-Fi", "Kitchen"));
    body.put("latitude", 36.88);
    body.put("longitude", 10.33);
    body.put("capacity", 4);
    body.put("bedrooms", 2);
    body.put("bathrooms", 1);
    body.put("nightlyPrice", new BigDecimal("123.456"));
    body.put("cleaningFee", new BigDecimal("10.000"));
    body.put("serviceFee", new BigDecimal("5.000"));
    body.put("status", status);
    return body;
  }

  private <T> ResponseEntity<T> host(String path, HttpMethod method, Object body, Class<T> type) {
    HttpHeaders headers = new HttpHeaders();
    headers.set("X-Demo-Identity", "host");
    return http.exchange(path, method, new HttpEntity<>(body, headers), type);
  }

  private PropertyView create(String status) {
    var response =
        host("/api/host/properties", HttpMethod.POST, payload(status), PropertyView.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    PropertyView p = response.getBody();
    assertThat(p).isNotNull();
    created.add(p.id());
    return p;
  }

  @Test
  void createsDraftPublishesAndFiltersDecimalPrices() {
    PropertyView p = create("DRAFT");
    assertThat(p.nightlyPrice()).isEqualByComparingTo("123.456");
    assertThat(p.hostId()).isEqualTo(UUID.fromString("00000000-0000-0000-0000-000000000002"));
    assertThat(http.getForEntity("/api/properties/" + p.id(), String.class).getStatusCode())
        .isEqualTo(HttpStatus.NOT_FOUND);
    var update = payload("PUBLISHED");
    update.put("hostId", "00000000-0000-0000-0000-000000000003");
    assertThat(
            host("/api/host/properties/" + p.id(), HttpMethod.PUT, update, PropertyView.class)
                .getBody()
                .hostId())
        .isEqualTo(p.hostId());
    String path =
        "/api/properties?destination=Test&category=Houses&guests=4&minPrice=123.456&maxPrice=123.456";
    assertThat(http.getForEntity(path, String.class).getBody()).contains(p.id().toString());
    assertThat(http.getForEntity("/api/properties?minPrice=124", String.class).getBody())
        .doesNotContain(p.id().toString());
    assertThat(
            http.getForEntity("/api/properties?minPrice=200&maxPrice=100", String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void enforcesRolesAndForeignPropertyOwnership() {
    assertThat(
            http.postForEntity("/api/host/properties", payload("PUBLISHED"), String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    UUID foreign = UUID.fromString("10000000-0000-0000-0000-000000000003");
    assertThat(
            host("/api/host/properties/" + foreign, HttpMethod.GET, null, String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(
            host("/api/host/properties/" + foreign, HttpMethod.PUT, payload("DRAFT"), String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(
            host("/api/host/properties/" + foreign, HttpMethod.DELETE, null, String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  void validatesImageSchemesCoordinatesMoneyAndCategory() {
    for (var entry :
        List.of(
            Map.entry("images", List.of("javascript:alert(1)")),
            Map.entry("images", List.of("relative-photo.jpg")),
            Map.entry("images", List.of("https://user:password@example.com/photo.jpg")),
            Map.entry("images", List.of("https://example.com/a|b.jpg")),
            Map.entry("nightlyPrice", new BigDecimal("10.1234")),
            Map.entry("nightlyPrice", BigDecimal.ZERO),
            Map.entry("latitude", 91),
            Map.entry("capacity", 21),
            Map.entry("bathrooms", 0),
            Map.entry("category", "Unsupported"),
            Map.entry("status", "ARCHIVED"))) {
      var body = payload("PUBLISHED");
      body.put(entry.getKey(), entry.getValue());
      assertThat(host("/api/host/properties", HttpMethod.POST, body, String.class).getStatusCode())
          .as(entry.getKey())
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }
  }

  @Test
  void archiveIsIdempotentAndPreservesRowForHistory() {
    PropertyView p = create("PUBLISHED");
    for (int i = 0; i < 2; i++)
      assertThat(
              host("/api/host/properties/" + p.id(), HttpMethod.DELETE, null, String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.NO_CONTENT);
    assertThat(
            host("/api/host/properties/" + p.id(), HttpMethod.GET, null, PropertyView.class)
                .getBody()
                .status())
        .isEqualTo("ARCHIVED");
    assertThat(
            jdbc.queryForObject(
                "select count(*) from stayora.properties where id=?", Integer.class, p.id()))
        .isEqualTo(1);
    assertThat(http.getForEntity("/api/properties/" + p.id(), String.class).getStatusCode())
        .isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(
            host(
                    "/api/host/properties/" + p.id(),
                    HttpMethod.PUT,
                    payload("PUBLISHED"),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
  }

  @Test
  void upcomingReservationPreventsArchiveAndUnsafeCapacityChange() {
    PropertyView p = create("PUBLISHED");
    LocalDate start = LocalDate.now().plusMonths(6).withDayOfMonth(2);
    assertThat(
            http.postForEntity(
                    "/api/reservations",
                    Map.of(
                        "propertyId",
                        p.id(),
                        "checkIn",
                        start,
                        "checkOut",
                        start.plusDays(2),
                        "guests",
                        4),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.CREATED);
    var smaller = payload("PUBLISHED");
    smaller.put("capacity", 2);
    assertThat(
            host("/api/host/properties/" + p.id(), HttpMethod.PUT, smaller, String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
    assertThat(
            host("/api/host/properties/" + p.id(), HttpMethod.DELETE, null, String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
    var repriced = payload("PUBLISHED");
    repriced.put("nightlyPrice", new BigDecimal("200.000"));
    assertThat(
            host("/api/host/properties/" + p.id(), HttpMethod.PUT, repriced, String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.OK);
    assertThat(
            jdbc.queryForObject(
                "select nightly_price from stayora.reservations where property_id=?",
                BigDecimal.class,
                p.id()))
        .isEqualByComparingTo("123.456");
  }

  @Test
  void wishlistsPersistIdempotentlyAndAreScopedToCurrentGuest() {
    PropertyView saved = create("PUBLISHED");
    PropertyView foreignSaved = create("PUBLISHED");
    String path = "/api/wishlists/" + saved.id();
    for (int i = 0; i < 2; i++) {
      assertThat(
              http.exchange(path, HttpMethod.PUT, new HttpEntity<>(Map.of()), String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.NO_CONTENT);
    }
    assertThat(
            jdbc.queryForObject(
                "select count(*) from stayora.wishlist_entries where property_id=?",
                Integer.class,
                saved.id()))
        .isEqualTo(1);
    jdbc.update(
        "insert into stayora.wishlist_entries values (?, '00000000-0000-0000-0000-000000000003', ?)",
        UUID.randomUUID(),
        foreignSaved.id());
    String mine = http.getForEntity("/api/wishlists", String.class).getBody();
    assertThat(mine).contains(saved.id().toString()).doesNotContain(foreignSaved.id().toString());
    assertThat(host("/api/wishlists", HttpMethod.GET, null, String.class).getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    host("/api/host/properties/" + saved.id(), HttpMethod.DELETE, null, String.class);
    assertThat(http.getForEntity("/api/wishlists", String.class).getBody())
        .doesNotContain(saved.id().toString());
    for (int i = 0; i < 2; i++)
      assertThat(
              http.exchange(path, HttpMethod.DELETE, HttpEntity.EMPTY, String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.NO_CONTENT);
    assertThat(
            jdbc.queryForObject(
                "select count(*) from stayora.wishlist_entries where property_id=?",
                Integer.class,
                saved.id()))
        .isZero();
  }
}
