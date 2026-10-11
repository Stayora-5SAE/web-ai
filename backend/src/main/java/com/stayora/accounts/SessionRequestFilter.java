package com.stayora.accounts;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class SessionRequestFilter extends OncePerRequestFilter {
  private final AuthService auth;
  private final ObjectMapper json;
  private final Set<String> origins;

  public SessionRequestFilter(
      AuthService auth,
      ObjectMapper json,
      @Value("${stayora.auth.origins:http://localhost:4200,http://127.0.0.1:4200}")
          String origins) {
    this.auth = auth;
    this.json = json;
    this.origins = Arrays.stream(origins.split(",")).map(String::strip).collect(Collectors.toSet());
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    boolean mutation = Set.of("POST", "PUT", "PATCH", "DELETE").contains(request.getMethod());
    if (request.getRequestURI().startsWith("/api/") && mutation) {
      String origin = request.getHeader("Origin");
      if (origin != null && !origins.contains(origin)) {
        denied(response, "This request origin is not allowed.");
        return;
      }
      AccountSession session = auth.session(request);
      boolean publicAuth =
          Set.of("/api/auth/login", "/api/auth/register").contains(request.getRequestURI());
      if (session != null && !publicAuth) {
        String csrf = request.getHeader("X-CSRF-Token");
        if (csrf == null
            || !MessageDigest.isEqual(
                session.csrfToken.getBytes(StandardCharsets.UTF_8),
                csrf.getBytes(StandardCharsets.UTF_8))) {
          denied(response, "Refresh the page before submitting this request.");
          return;
        }
      }
    }
    chain.doFilter(request, response);
  }

  private void denied(HttpServletResponse response, String message) throws IOException {
    response.setStatus(403);
    response.setContentType("application/json");
    json.writeValue(response.getWriter(), Map.of("status", 403, "message", message));
  }
}
