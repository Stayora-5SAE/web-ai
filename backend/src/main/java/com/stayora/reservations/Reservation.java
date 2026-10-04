package com.stayora.reservations;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "reservations", schema = "stayora")
public class Reservation {
  @Id public UUID id;
  public UUID propertyId;
  public UUID guestId;
  public LocalDate checkIn;
  public LocalDate checkOut;
  public int guests;

  @Column(precision = 12, scale = 3)
  public BigDecimal nightlyPrice;

  @Column(precision = 12, scale = 3)
  public BigDecimal subtotal;

  @Column(precision = 12, scale = 3)
  public BigDecimal cleaningFee;

  @Column(precision = 12, scale = 3)
  public BigDecimal serviceFee;

  @Column(precision = 12, scale = 3)
  public BigDecimal total;

  public String status;
  public String paymentStatus;
  public Instant createdAt;
}
