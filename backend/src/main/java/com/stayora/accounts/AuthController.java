package com.stayora.accounts;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService auth;
  private final boolean secure;
  private final boolean demo;

  public AuthController(
      AuthService auth,
      @Value("${stayora.auth.cookie-secure:true}") boolean secure,
      @Value("${stayora.demo-enabled:false}") boolean demo) {
    this.auth = auth;
    this.secure = secure;
    this.demo = demo;
  }

  @GetMapping("/session")
  public SessionView session(HttpServletRequest request, HttpServletResponse response) {
    response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
    AccountSession session = auth.session(request);
    if (session == null) {
      cookie(response, "", 0);
      return new SessionView(null, "", demo);
    }
    return new SessionView(auth.account(session), session.csrfToken, demo);
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public SessionView register(
      @Valid @RequestBody AuthService.Register request, HttpServletResponse response) {
    return issued(auth.register(request), response);
  }

  @PostMapping("/login")
  public SessionView login(
      @Valid @RequestBody AuthService.Login request, HttpServletResponse response) {
    return issued(auth.login(request), response);
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(HttpServletRequest request, HttpServletResponse response) {
    auth.logout(request);
    cookie(response, "", 0);
  }

  private SessionView issued(AuthService.IssuedSession session, HttpServletResponse response) {
    cookie(response, session.token(), 86_400);
    response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
    return new SessionView(session.account(), session.csrfToken(), demo);
  }

  private void cookie(HttpServletResponse response, String value, long seconds) {
    response.addHeader(
        HttpHeaders.SET_COOKIE,
        ResponseCookie.from(AuthService.COOKIE, value)
            .httpOnly(true)
            .secure(secure)
            .sameSite("Strict")
            .path("/api")
            .maxAge(seconds)
            .build()
            .toString());
  }

  public record SessionView(
      AccountService.AccountView account, String csrfToken, boolean demoEnabled) {}
}
