package com.stayora.accounts;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountSessionRepository extends JpaRepository<AccountSession, UUID> {
  Optional<AccountSession> findByTokenHashAndExpiresAtAfter(String tokenHash, Instant now);

  long deleteByExpiresAtBefore(Instant now);
}
