package com.stayora.listings;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "wishlist_entries", schema = "stayora")
public class WishlistEntry {
  @Id public UUID id;
  public UUID accountId;
  public UUID propertyId;
}
