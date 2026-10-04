package com.stayora.availability;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AvailabilityRepository extends JpaRepository<AvailabilityBlock, UUID> {
  boolean existsByPropertyIdAndStartDateLessThanAndEndDateGreaterThan(
      UUID id, LocalDate end, LocalDate start);

  List<AvailabilityBlock> findByPropertyId(UUID id);
}
