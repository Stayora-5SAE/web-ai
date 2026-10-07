package com.stayora.listings;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wishlists")
public class WishlistController {
  private final WishlistService wishlists;

  public WishlistController(WishlistService wishlists) {
    this.wishlists = wishlists;
  }

  @GetMapping
  public List<ListingService.PropertyView> get() {
    return wishlists.all();
  }

  @PutMapping("/{propertyId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void save(@PathVariable UUID propertyId) {
    wishlists.save(propertyId);
  }

  @DeleteMapping("/{propertyId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remove(@PathVariable UUID propertyId) {
    wishlists.remove(propertyId);
  }
}
