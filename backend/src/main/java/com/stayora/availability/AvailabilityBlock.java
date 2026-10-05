package com.stayora.availability;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "availability_blocks", schema = "stayora")
public class AvailabilityBlock {
  @Id public UUID id;
  public UUID propertyId;
  public LocalDate startDate;
  public LocalDate endDate;
  public String reason;
}
