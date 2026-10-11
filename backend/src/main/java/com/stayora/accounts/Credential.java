package com.stayora.accounts;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "account_credentials", schema = "stayora")
public class Credential {
  @Id public UUID accountId;
  public String passwordHash;
}
