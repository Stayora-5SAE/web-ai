package com.stayora;

import static org.assertj.core.api.Assertions.assertThat;

import com.stayora.reservations.ReservationAiSkill;
import com.stayora.reservations.ReservationService.BookingRequest;
import com.stayora.reservations.ReservationService.PaymentView;
import com.stayora.reservations.ReservationService.ReservationView;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
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
class ReservationLifecycleIntegrationTest {
  @Autowired TestRestTemplate http;
  @Autowired JdbcTemplate jdbc;
  private static final UUID PROPERTY = UUID.fromString("10000000-0000-0000-0000-000000000001");
  private final List<UUID> created = new ArrayList<>();
  private final LocalDate start = LocalDate.now().plusMonths(14).withDayOfMonth(5);

  @AfterEach
  void cleanupOwnedTestRecords() {
    assertThat(jdbc.queryForObject("select current_database()", String.class))
        .isEqualTo("stayora_test");
    for (UUID id : created) jdbc.update("delete from stayora.reservations where id=?", id);
  }

  private ReservationView book() {
    ReservationView r =
        http.postForEntity(
                "/api/reservations",
                new BookingRequest(PROPERTY, start, start.plusDays(3), 2),
                ReservationView.class)
            .getBody();
    assertThat(r).isNotNull();
    assertThat(r.id()).isNotNull();
    created.add(r.id());
    return r;
  }

  private ResponseEntity<String> patch(String path, Object body, String identity) {
    HttpHeaders headers = new HttpHeaders();
    headers.set("X-Demo-Identity", identity);
    return http.exchange(path, HttpMethod.PATCH, new HttpEntity<>(body, headers), String.class);
  }

  @Test
  void cancellationPersistsFullSimulatedRefundAndReleasesDates() {
    ReservationView r = book();
    PaymentView before =
        http.getForObject("/api/reservations/" + r.id() + "/payment", PaymentView.class);
    assertThat(before.id()).isNotNull();
    assertThat(before.amount()).isEqualByComparingTo("540.000");
    assertThat(before.mode()).isEqualTo("SIMULATED");
    assertThat(before.status()).isEqualTo("CAPTURED");
    assertThat(
            patch(
                    "/api/reservations/" + r.id() + "/cancel",
                    Map.of("reason", "Plans changed"),
                    "guest")
                .getStatusCode())
        .isEqualTo(HttpStatus.OK);
    ReservationView cancelled =
        http.getForObject("/api/reservations/" + r.id(), ReservationView.class);
    assertThat(cancelled.status()).isEqualTo("CANCELLED");
    assertThat(cancelled.paymentStatus()).isEqualTo("SIMULATED_REFUNDED");
    PaymentView after =
        http.getForObject("/api/reservations/" + r.id() + "/payment", PaymentView.class);
    assertThat(after.id()).isEqualTo(before.id());
    assertThat(after.status()).isEqualTo("REFUNDED");
    assertThat(after.refundedAt()).isNotNull();
    assertThat(after.amount()).isEqualByComparingTo(before.amount());
    assertThat(
            patch(
                    "/api/reservations/" + r.id() + "/cancel",
                    Map.of("reason", "Repeat cancellation"),
                    "guest")
                .getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
    assertThat(
            patch(
                    "/api/host/reservations/" + r.id() + "/status",
                    Map.of("status", "CONFIRMED"),
                    "host")
                .getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
    ReservationView replacement = book();
    assertThat(replacement.id()).isNotEqualTo(r.id());
  }

  @Test
  void declineRefundsAndCannotRecapturePayment() {
    ReservationView r = book();
    assertThat(
            patch(
                    "/api/host/reservations/" + r.id() + "/status",
                    Map.of("status", "DECLINED"),
                    "host")
                .getStatusCode())
        .isEqualTo(HttpStatus.OK);
    PaymentView receipt =
        http.getForObject("/api/reservations/" + r.id() + "/payment", PaymentView.class);
    assertThat(receipt.status()).isEqualTo("REFUNDED");
    assertThat(
            jdbc.queryForObject(
                "select count(*) from stayora.reservation_payments where reservation_id=?",
                Integer.class,
                r.id()))
        .isEqualTo(1);
    assertThat(
            patch(
                    "/api/reservations/" + r.id() + "/cancel",
                    Map.of("reason", "Already declined"),
                    "guest")
                .getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
  }

  @Test
  void rejectsHostCancellationShortReasonAndCancellationAtCheckIn() {
    ReservationView r = book();
    String path = "/api/reservations/" + r.id() + "/cancel";
    assertThat(
            patch(path, Map.of("reason", "Host cannot cancel a guest request"), "host")
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(patch(path, Map.of("reason", "  "), "guest").getStatusCode())
        .isEqualTo(HttpStatus.BAD_REQUEST);
    jdbc.update(
        "update stayora.reservations set check_in=?,check_out=? where id=?",
        LocalDate.now(),
        LocalDate.now().plusDays(3),
        r.id());
    assertThat(patch(path, Map.of("reason", "Too late to cancel"), "guest").getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
  }

  @Test
  void ledgerKeepsPriceSnapshotAndHistoryRequiresAppropriateRole() {
    ReservationView r = book();
    jdbc.update("update stayora.properties set nightly_price=999 where id=?", PROPERTY);
    try {
      PaymentView receipt =
          http.getForObject("/api/reservations/" + r.id() + "/payment", PaymentView.class);
      assertThat(receipt.amount()).isEqualByComparingTo("540.000");
      assertThat(http.getForObject("/api/reservations", String.class)).contains(r.id().toString());
      assertThat(http.getForEntity("/api/reservations/host", String.class).getStatusCode())
          .isEqualTo(HttpStatus.FORBIDDEN);
      HttpHeaders headers = new HttpHeaders();
      headers.set("X-Demo-Identity", "host");
      assertThat(
              http.exchange(
                      "/api/reservations", HttpMethod.GET, new HttpEntity<>(headers), String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.FORBIDDEN);
      assertThat(
              http.exchange(
                      "/api/reservations/host",
                      HttpMethod.GET,
                      new HttpEntity<>(headers),
                      String.class)
                  .getBody())
          .contains(r.id().toString());
      assertThat(
              jdbc.queryForList(
                  "select column_name from information_schema.columns where table_schema='stayora' and table_name='reservation_payments'",
                  String.class))
          .doesNotContain("card_number", "cvv");
    } finally {
      jdbc.update("update stayora.properties set nightly_price=160 where id=?", PROPERTY);
    }
  }

  @Test
  void itineraryMockIsDeterministicAdviceWithoutBookingActions() {
    ReservationAiSkill skill = new ReservationAiSkill();
    String context = "La Marsa, three nights, two guests";
    assertThat(skill.mock(context)).isEqualTo(skill.mock(context));
    assertThat(skill.mock(context))
        .contains("Advice only", context, "No activity, reservation or payment has been arranged");
    assertThat(skill.systemPrompt()).contains("Never perform booking or payment actions");
  }
}
