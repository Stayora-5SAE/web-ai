package com.stayora.reservations;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reservation_payments", schema = "stayora")
public class ReservationPayment {
  @Id public UUID id;
  public UUID reservationId;

  @Column(precision = 12, scale = 3)
  public BigDecimal amount;

  public String currency;
  public String mode;
  public String status;
  public String reference;
  public Instant capturedAt;
  public Instant refundedAt;
}
