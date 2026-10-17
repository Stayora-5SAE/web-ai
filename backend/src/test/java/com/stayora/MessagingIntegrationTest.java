package com.stayora;

import static org.assertj.core.api.Assertions.assertThat;

import com.stayora.messages.MessagingService;
import com.stayora.reservations.ReservationService;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
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
class MessagingIntegrationTest {
  @Autowired TestRestTemplate http;
  @Autowired JdbcTemplate jdbc;
  private static final UUID PROPERTY = UUID.fromString("10000000-0000-0000-0000-000000000001");

  @BeforeEach
  void cleanOnlyTestConversations() {
    assertThat(jdbc.queryForObject("select current_database()", String.class))
        .isEqualTo("stayora_test");
    jdbc.update("delete from stayora.messages");
    jdbc.update("delete from stayora.conversations");
  }

  private <T> ResponseEntity<T> request(
      String path, HttpMethod method, Object body, String identity, Class<T> type) {
    HttpHeaders headers = new HttpHeaders();
    headers.set("X-Demo-Identity", identity);
    return http.exchange(path, method, new HttpEntity<>(body, headers), type);
  }

  private MessagingService.ThreadView inquiry() {
    var response =
        request(
            "/api/messages/inquiries",
            HttpMethod.POST,
            Map.of("propertyId", PROPERTY),
            "guest",
            MessagingService.ThreadView.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    return response.getBody();
  }

  @Test
  void inquiryIsIdempotentAndMessagesHaveServerOwnedIdentity() {
    var thread = inquiry();
    assertThat(inquiry().id()).isEqualTo(thread.id());
    var sent =
        request(
            "/api/messages/threads/" + thread.id() + "/messages",
            HttpMethod.POST,
            Map.of(
                "body", "  Arrival question  ", "senderId", "00000000-0000-0000-0000-000000000002"),
            "guest",
            MessagingService.MessageView.class);
    assertThat(sent.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(sent.getBody().body()).isEqualTo("Arrival question");
    assertThat(sent.getBody().senderId()).isEqualTo(thread.guestId());
    var read =
        request(
                "/api/messages/threads/" + thread.id(),
                HttpMethod.GET,
                null,
                "host",
                MessagingService.ThreadView.class)
            .getBody();
    assertThat(read.messages()).hasSize(1);
    assertThat(read.unreadCount()).isEqualTo(1);
    var marked =
        request(
                "/api/messages/threads/" + thread.id() + "/read",
                HttpMethod.POST,
                Map.of(),
                "host",
                MessagingService.ThreadView.class)
            .getBody();
    assertThat(marked.unreadCount()).isZero();
    request(
        "/api/messages/threads/" + thread.id() + "/messages",
        HttpMethod.POST,
        Map.of("body", "Happy to help!"),
        "host",
        MessagingService.MessageView.class);
    var guest =
        request(
                "/api/messages/threads/" + thread.id(),
                HttpMethod.GET,
                null,
                "guest",
                MessagingService.ThreadView.class)
            .getBody();
    assertThat(guest.messages()).hasSize(2);
    assertThat(guest.unreadCount()).isEqualTo(1);
  }

  @Test
  void onlySenderCanEditAndRemoveAndDeletedTextIsErased() {
    var thread = inquiry();
    var sent =
        request(
                "/api/messages/threads/" + thread.id() + "/messages",
                HttpMethod.POST,
                Map.of("body", "Original"),
                "guest",
                MessagingService.MessageView.class)
            .getBody();
    String path = "/api/messages/threads/" + thread.id() + "/messages/" + sent.id();
    assertThat(
            request(path, HttpMethod.PUT, Map.of("body", "Forged"), "host", String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(request(path, HttpMethod.DELETE, null, "host", String.class).getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    var edited =
        request(
                path,
                HttpMethod.PUT,
                Map.of("body", "Edited"),
                "guest",
                MessagingService.MessageView.class)
            .getBody();
    assertThat(edited.body()).isEqualTo("Edited");
    assertThat(edited.editedAt()).isNotNull();
    assertThat(request(path, HttpMethod.DELETE, null, "guest", String.class).getStatusCode())
        .isEqualTo(HttpStatus.NO_CONTENT);
    assertThat(
            jdbc.queryForObject(
                "select body from stayora.messages where id=?", String.class, sent.id()))
        .isEmpty();
    assertThat(
            request(path, HttpMethod.PUT, Map.of("body", "Resurrect"), "guest", String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
  }

  @Test
  void rejectsInvalidBodyUnknownThreadsAndNonGuestInquiries() {
    var thread = inquiry();
    for (String body : new String[] {"   ", "x".repeat(2001)}) {
      assertThat(
              request(
                      "/api/messages/threads/" + thread.id() + "/messages",
                      HttpMethod.POST,
                      Map.of("body", body),
                      "guest",
                      String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }
    assertThat(
            request(
                    "/api/messages/threads/" + UUID.randomUUID(),
                    HttpMethod.GET,
                    null,
                    "guest",
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(
            request(
                    "/api/messages/inquiries",
                    HttpMethod.POST,
                    Map.of("propertyId", PROPERTY),
                    "host",
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(
            request(
                    "/api/messages/inquiries",
                    HttpMethod.POST,
                    Map.of("propertyId", "10000000-0000-0000-0000-000000000008"),
                    "guest",
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  @SuppressWarnings("unchecked")
  void unrelatedAuthenticatedGuestCannotReadSendEditDeleteOrMarkRead() {
    var thread = inquiry();
    var sent =
        request(
                "/api/messages/threads/" + thread.id() + "/messages",
                HttpMethod.POST,
                Map.of("body", "Private"),
                "guest",
                MessagingService.MessageView.class)
            .getBody();
    var registered =
        http.postForEntity(
            "/api/auth/register",
            Map.of(
                "name",
                "Messaging test guest",
                "email",
                UUID.randomUUID() + "@example.test",
                "password",
                "MessageTestPassword!2026",
                "role",
                "GUEST"),
            Map.class);
    assertThat(registered.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    Map<String, Object> account = (Map<String, Object>) registered.getBody().get("account");
    UUID id = UUID.fromString(account.get("id").toString());
    HttpHeaders headers = new HttpHeaders();
    headers.set(
        HttpHeaders.COOKIE,
        registered.getHeaders().getFirst(HttpHeaders.SET_COOKIE).split(";", 2)[0]);
    headers.set("X-CSRF-Token", registered.getBody().get("csrfToken").toString());
    try {
      String base = "/api/messages/threads/" + thread.id();
      assertThat(
              http.exchange(base, HttpMethod.GET, new HttpEntity<>(headers), String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.FORBIDDEN);
      assertThat(
              http.exchange(
                      base + "/read",
                      HttpMethod.POST,
                      new HttpEntity<>(Map.of(), headers),
                      String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.FORBIDDEN);
      assertThat(
              http.exchange(
                      base + "/messages",
                      HttpMethod.POST,
                      new HttpEntity<>(Map.of("body", "Intrusion"), headers),
                      String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.FORBIDDEN);
      assertThat(
              http.exchange(
                      base + "/messages/" + sent.id(),
                      HttpMethod.PUT,
                      new HttpEntity<>(Map.of("body", "Intrusion"), headers),
                      String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.FORBIDDEN);
      assertThat(
              http.exchange(
                      base + "/messages/" + sent.id(),
                      HttpMethod.DELETE,
                      new HttpEntity<>(headers),
                      String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.FORBIDDEN);
      var inbox =
          http.exchange(
                  "/api/messages",
                  HttpMethod.GET,
                  new HttpEntity<>(headers),
                  MessagingService.ThreadView[].class)
              .getBody();
      assertThat(inbox).isEmpty();
    } finally {
      jdbc.update("delete from stayora.accounts where id=?", id);
    }
  }

  @Test
  void deterministicMessageDraftIdentifiesMockMode() {
    var request = Map.of("skill", "message-draft", "context", "arrival|Quiet courtyard");
    String first = http.postForEntity("/api/ai/assist", request, String.class).getBody();
    String second = http.postForEntity("/api/ai/assist", request, String.class).getBody();
    assertThat(first)
        .isEqualTo(second)
        .contains("\"mode\":\"mock\"")
        .contains("check-in instructions")
        .contains("\"reviewRequired\":true");
    assertThat(jdbc.queryForObject("select count(*) from stayora.messages", Long.class)).isZero();
  }

  @Test
  void reservationLinksCreateOneSharedAuthorizedConversation() {
    LocalDate date = LocalDate.now().plusYears(2).withDayOfMonth(4);
    var booking =
        http.postForEntity(
                "/api/reservations",
                new ReservationService.BookingRequest(PROPERTY, date, date.plusDays(2), 2),
                ReservationService.ReservationView.class)
            .getBody();
    assertThat(booking).isNotNull();
    try {
      String path = "/api/messages/reservations/" + booking.id();
      var guest =
          request(path, HttpMethod.POST, Map.of(), "guest", MessagingService.ThreadView.class)
              .getBody();
      var host =
          request(path, HttpMethod.POST, Map.of(), "host", MessagingService.ThreadView.class)
              .getBody();
      assertThat(host.id()).isEqualTo(guest.id());
      assertThat(host.reservationId()).isEqualTo(booking.id());
      assertThat(host.viewerId()).isEqualTo(host.hostId());
    } finally {
      jdbc.update("delete from stayora.reservations where id=?", booking.id());
    }
  }
}
