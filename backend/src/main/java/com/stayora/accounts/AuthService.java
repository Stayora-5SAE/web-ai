package com.stayora.accounts;

import com.stayora.shared.ApiException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  public static final String COOKIE = "stayora_session";
  private final AccountRepository accounts;
  private final CredentialRepository credentials;
  private final AccountSessionRepository sessions;
  private final PasswordHasher passwords;
  private final SecureRandom random = new SecureRandom();
  private final String dummyHash;

  public AuthService(
      AccountRepository accounts,
      CredentialRepository credentials,
      AccountSessionRepository sessions,
      PasswordHasher passwords) {
    this.accounts = accounts;
    this.credentials = credentials;
    this.sessions = sessions;
    this.passwords = passwords;
    this.dummyHash = passwords.hash(UUID.randomUUID().toString());
  }

  @Transactional
  public IssuedSession register(Register request) {
    String email = request.email().strip().toLowerCase(Locale.ROOT);
    if (accounts.findByEmail(email).isPresent())
      throw ApiException.conflict("This email is already registered.");
    Account account = new Account(UUID.randomUUID(), request.name().strip(), email, request.role());
    accounts.saveAndFlush(account);
    Credential credential = new Credential();
    credential.accountId = account.id;
    credential.passwordHash = passwords.hash(request.password());
    credentials.save(credential);
    return issue(account);
  }

  @Transactional
  public IssuedSession login(Login request) {
    Account account =
        accounts.findByEmail(request.email().strip().toLowerCase(Locale.ROOT)).orElse(null);
    Credential credential = account == null ? null : credentials.findById(account.id).orElse(null);
    boolean valid =
        passwords.matches(
            request.password(), credential == null ? dummyHash : credential.passwordHash);
    if (!valid || credential == null)
      throw ApiException.unauthorized("Email or password is incorrect.");
    return issue(account);
  }

  private IssuedSession issue(Account account) {
    sessions.deleteByExpiresAtBefore(Instant.now());
    String token = token();
    AccountSession session = new AccountSession();
    session.id = UUID.randomUUID();
    session.accountId = account.id;
    session.tokenHash = digest(token);
    session.csrfToken = token();
    session.expiresAt = Instant.now().plus(24, ChronoUnit.HOURS);
    sessions.save(session);
    return new IssuedSession(token, session.csrfToken, view(account));
  }

  public AccountSession session(HttpServletRequest request) {
    String token = cookieToken(request);
    return token == null
        ? null
        : sessions.findByTokenHashAndExpiresAtAfter(digest(token), Instant.now()).orElse(null);
  }

  public String cookieToken(HttpServletRequest request) {
    Cookie[] cookies = request.getCookies();
    if (cookies != null)
      for (Cookie cookie : cookies)
        if (COOKIE.equals(cookie.getName()) && cookie.getValue().matches("[A-Za-z0-9_-]{43}"))
          return cookie.getValue();
    return null;
  }

  @Transactional
  public void logout(HttpServletRequest request) {
    AccountSession session = session(request);
    if (session != null) sessions.delete(session);
  }

  public AccountService.AccountView account(AccountSession session) {
    return view(accounts.findById(session.accountId).orElseThrow(ApiException::notFound));
  }

  private static AccountService.AccountView view(Account account) {
    return new AccountService.AccountView(account.id, account.name, account.email, account.role);
  }

  private String token() {
    byte[] bytes = new byte[32];
    random.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private String digest(String token) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IllegalStateException("Session hashing is unavailable.");
    }
  }

  public record Register(
      @NotBlank @Size(max = 120) String name,
      @NotBlank @Email @Size(max = 180) String email,
      @NotBlank @Size(min = 10, max = 128) String password,
      @NotBlank @Pattern(regexp = "GUEST|HOST") String role) {}

  public record Login(
      @NotBlank @Email @Size(max = 180) String email, @NotBlank @Size(max = 128) String password) {}

  public record IssuedSession(String token, String csrfToken, AccountService.AccountView account) {}
}
