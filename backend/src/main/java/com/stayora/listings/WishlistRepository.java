package com.stayora.listings;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WishlistRepository extends JpaRepository<WishlistEntry, UUID> {
  List<WishlistEntry> findByAccountId(UUID accountId);

  void deleteByAccountIdAndPropertyId(UUID accountId, UUID propertyId);

  @Modifying
  @Query(
      value =
          "insert into stayora.wishlist_entries (id, account_id, property_id) values (:id, :account, :property) on conflict (account_id, property_id) do nothing",
      nativeQuery = true)
  void insertIfAbsent(
      @Param("id") UUID id, @Param("account") UUID account, @Param("property") UUID property);
}
