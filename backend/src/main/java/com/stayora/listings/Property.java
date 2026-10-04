package com.stayora.listings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "properties", schema = "stayora")
public class Property {
  @Id public UUID id;
  public UUID hostId;
  public String title;
  public String destination;
  public String category;

  @Column(columnDefinition = "text")
  public String description;

  @Column(columnDefinition = "text")
  public String imageUrls;

  @Column(columnDefinition = "text")
  public String amenities;

  public String badge;
  public double latitude;
  public double longitude;
  public int capacity;
  public int bedrooms;
  public int bathrooms;

  @Column(precision = 12, scale = 3)
  public BigDecimal nightlyPrice;

  @Column(precision = 12, scale = 3)
  public BigDecimal cleaningFee;

  @Column(precision = 12, scale = 3)
  public BigDecimal serviceFee;

  @Column(precision = 3, scale = 2)
  public BigDecimal rating;

  public int reviewCount;
  public String status;
}
