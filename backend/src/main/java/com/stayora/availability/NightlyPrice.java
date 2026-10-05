package com.stayora.availability;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "nightly_prices", schema = "stayora")
public class NightlyPrice {
  @Id public UUID id;
  public UUID propertyId;
  public LocalDate date;
  public BigDecimal nightlyPrice;
}
