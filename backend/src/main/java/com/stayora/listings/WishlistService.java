package com.stayora.listings;

import com.stayora.accounts.AccountService;
import com.stayora.shared.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WishlistService {
  private final WishlistRepository entries;
  private final ListingService listings;
  private final AccountService accounts;

  public WishlistService(
      WishlistRepository entries, ListingService listings, AccountService accounts) {
    this.entries = entries;
    this.listings = listings;
    this.accounts = accounts;
  }

  public List<ListingService.PropertyView> all() {
    UUID accountId = accounts.requireRole("GUEST").id();
    return entries.findByAccountId(accountId).stream()
        .map(entry -> listings.get(entry.propertyId))
        .filter(p -> "PUBLISHED".equals(p.status()))
        .toList();
  }

  @Transactional
  public void save(UUID propertyId) {
    UUID accountId = accounts.requireRole("GUEST").id();
    // The same property lock makes saves and archive decisions consistent.
    var property = listings.lock(propertyId);
    if (!"PUBLISHED".equals(property.status())) throw ApiException.notFound();
    entries.insertIfAbsent(UUID.randomUUID(), accountId, propertyId);
  }

  @Transactional
  public void remove(UUID propertyId) {
    entries.deleteByAccountIdAndPropertyId(accounts.requireRole("GUEST").id(), propertyId);
  }
}
