package com.stayora.accounts;

import static org.assertj.core.api.Assertions.assertThat;

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

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = "stayora.demo-enabled=false")
@ActiveProfiles("test")
@Sql(scripts = "/dev-seed.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_CLASS)
class AuthIntegrationTest {
  @Autowired TestRestTemplate http;
  @Autowired JdbcTemplate jdbc;
  private final String password = "Test-only-valid-password42";
  private final String email = UUID.randomUUID() + "@auth-test.invalid";

  @BeforeEach
  void testDatabaseOnly() {
    assertThat(jdbc.queryForObject("select current_database()", String.class))
        .isEqualTo("stayora_test");
  }

  @AfterEach
  void removeSyntheticAccount() {
    jdbc.update("delete from stayora.accounts where email=?", email);
  }

  private ResponseEntity<AuthController.SessionView> register() {
    return http.postForEntity(
        "/api/auth/register",
        Map.of("name", "Synthetic Guest", "email", email, "password", password, "role", "GUEST"),
        AuthController.SessionView.class);
  }

  private HttpHeaders headers(ResponseEntity<AuthController.SessionView> issued, boolean csrf) {
    HttpHeaders headers = new HttpHeaders();
    headers.set(
        HttpHeaders.COOKIE, issued.getHeaders().getFirst(HttpHeaders.SET_COOKIE).split(";")[0]);
    if (csrf) headers.set("X-CSRF-Token", issued.getBody().csrfToken());
    return headers;
  }

  @Test
  void persistsHashedCredentialsAndHttpOnlySessionWithRealIdentity() {
    var issued = register();
    assertThat(issued.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(issued.getHeaders().getFirst(HttpHeaders.SET_COOKIE))
        .contains("HttpOnly", "SameSite=Strict", "Path=/api");
    assertThat(issued.getBody().demoEnabled()).isFalse();
    assertThat(issued.getBody().account().email()).isEqualTo(email);
    String hash =
        jdbc.queryForObject(
            "select password_hash from stayora.account_credentials where account_id=?",
            String.class,
            issued.getBody().account().id());
    assertThat(hash).doesNotContain(password).startsWith("600000:");
    HttpHeaders headers = headers(issued, true);
    headers.set("X-Demo-Identity", "host");
    var me =
        http.exchange(
            "/api/accounts/me",
            HttpMethod.GET,
            new HttpEntity<>(headers),
            AccountService.AccountView.class);
    assertThat(me.getBody().role()).isEqualTo("GUEST");
    assertThat(
            http.exchange(
                    "/api/host/listings", HttpMethod.GET, new HttpEntity<>(headers), String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  void requiresSessionAndCsrfAndRejectsUntrustedOrigins() {
    assertThat(http.getForEntity("/api/accounts/me", String.class).getStatusCode())
        .isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(http.getForEntity("/api/properties", String.class).getStatusCode())
        .isEqualTo(HttpStatus.OK);
    var issued = register();
    String url = "/api/wishlists/10000000-0000-0000-0000-000000000001";
    assertThat(
            http.exchange(
                    url,
                    HttpMethod.PUT,
                    new HttpEntity<>(Map.of(), headers(issued, false)),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(
            http.exchange(
                    url,
                    HttpMethod.PUT,
                    new HttpEntity<>(Map.of(), headers(issued, true)),
                    String.class)
                .getStatusCode()
                .is2xxSuccessful())
        .isTrue();
    HttpHeaders hostile = headers(issued, true);
    hostile.set(HttpHeaders.ORIGIN, "https://attacker.invalid");
    assertThat(
            http.exchange(url, HttpMethod.DELETE, new HttpEntity<>(hostile), String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  void loginLogoutAndDuplicateValidationAreConsistent() {
    var issued = register();
    assertThat(register().getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(
            http.postForEntity(
                    "/api/auth/login", Map.of("email", email, "password", "wrong"), String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(
            http.postForEntity(
                    "/api/auth/login",
                    Map.of("email", email.toUpperCase(), "password", password),
                    AuthController.SessionView.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.OK);
    assertThat(
            http.exchange(
                    "/api/auth/logout",
                    HttpMethod.POST,
                    new HttpEntity<>(Map.of(), headers(issued, true)),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.NO_CONTENT);
    assertThat(
            http.exchange(
                    "/api/accounts/me",
                    HttpMethod.GET,
                    new HttpEntity<>(headers(issued, false)),
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.UNAUTHORIZED);
  }
}
