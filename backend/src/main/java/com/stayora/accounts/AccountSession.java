package com.stayora.accounts;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "account_sessions", schema = "stayora")
public class AccountSession {
  @Id public UUID id;
  public UUID accountId;
  public String tokenHash;
  public String csrfToken;
  public Instant expiresAt;
}
