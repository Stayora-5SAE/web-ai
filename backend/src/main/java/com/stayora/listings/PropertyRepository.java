package com.stayora.listings;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PropertyRepository extends JpaRepository<Property, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select p from Property p where p.id = :id")
  Optional<Property> lockById(@Param("id") UUID id);
}
