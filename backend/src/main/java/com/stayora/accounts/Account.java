package com.stayora.accounts;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "accounts", schema = "stayora")
public class Account {
  @Id public UUID id;
  public String name;
  public String email;
  public String role;

  protected Account() {}

  public Account(UUID id, String name, String email, String role) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
  }
}
