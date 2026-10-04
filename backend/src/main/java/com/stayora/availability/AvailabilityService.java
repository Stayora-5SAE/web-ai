package com.stayora.availability;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AvailabilityService {
  private final AvailabilityRepository blocks;

  public AvailabilityService(AvailabilityRepository blocks) {
    this.blocks = blocks;
  }

  public boolean blocked(UUID propertyId, LocalDate start, LocalDate end) {
    return blocks.existsByPropertyIdAndStartDateLessThanAndEndDateGreaterThan(
        propertyId, end, start);
  }

  public List<BlockView> forProperty(UUID propertyId) {
    return blocks.findByPropertyId(propertyId).stream()
        .map(b -> new BlockView(b.startDate, b.endDate, b.reason))
        .toList();
  }

  public record BlockView(LocalDate startDate, LocalDate endDate, String reason) {}
}
