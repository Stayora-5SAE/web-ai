package com.stayora.accounts;

import com.stayora.shared.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AccountService {
  public static final UUID GUEST_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  public static final UUID HOST_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
  private final AccountRepository accounts;
  private final HttpServletRequest request;

  public AccountService(AccountRepository accounts, HttpServletRequest request) {
    this.accounts = accounts;
    this.request = request;
  }

  public AccountView current() {
    String identity = request.getHeader("X-Demo-Identity");
    if (identity != null && !identity.equals("guest") && !identity.equals("host"))
      throw ApiException.forbidden();
    return get("host".equals(identity) ? HOST_ID : GUEST_ID);
  }

  public AccountView requireRole(String role) {
    AccountView account = current();
    if (!role.equals(account.role())) throw ApiException.forbidden();
    return account;
  }

  public AccountView get(UUID id) {
    Account a = accounts.findById(id).orElseThrow(ApiException::notFound);
    return new AccountView(a.id, a.name, a.email, a.role);
  }

  public record AccountView(UUID id, String name, String email, String role) {}
}
