package com.stayora.listings;

import com.stayora.shared.ApiException;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ListingService {
  private final PropertyRepository properties;
  private final com.stayora.accounts.AccountService accounts;

  public ListingService(
      PropertyRepository properties, com.stayora.accounts.AccountService accounts) {
    this.properties = properties;
    this.accounts = accounts;
  }

  public PropertyView get(UUID id) {
    return view(properties.findById(id).orElseThrow(ApiException::notFound));
  }

  /** Caller must hold a transaction; used to serialize reservation writes. */
  public PropertyView lock(UUID id) {
    return view(properties.lockById(id).orElseThrow(ApiException::notFound));
  }

  public List<PropertyView> published(String destination, String category, Integer guests) {
    if (guests != null && (guests < 1 || guests > 20))
      throw ApiException.badRequest("Guests must be between 1 and 20.");
    return properties.findAll().stream()
        .filter(p -> "PUBLISHED".equals(p.status))
        .filter(
            p ->
                destination == null
                    || p.destination
                        .toLowerCase(java.util.Locale.ROOT)
                        .contains(destination.toLowerCase(java.util.Locale.ROOT)))
        .filter(p -> category == null || category.isBlank() || category.equals(p.category))
        .filter(p -> guests == null || p.capacity >= guests)
        .sorted((a, b) -> b.rating.compareTo(a.rating))
        .map(this::view)
        .toList();
  }

  public List<PropertyView> forHost(UUID hostId) {
    return properties.findAll().stream()
        .filter(p -> p.hostId.equals(hostId))
        .map(this::view)
        .toList();
  }

  private PropertyView view(Property p) {
    return new PropertyView(
        p.id,
        p.hostId,
        p.title,
        p.destination,
        p.category,
        p.description,
        Arrays.asList(p.imageUrls.split("\\|")),
        Arrays.asList(p.amenities.split("\\|")),
        p.badge,
        p.latitude,
        p.longitude,
        p.capacity,
        p.bedrooms,
        p.bathrooms,
        p.nightlyPrice,
        p.cleaningFee,
        p.serviceFee,
        p.rating,
        p.reviewCount,
        p.status,
        accounts.get(p.hostId).name());
  }

  public record PropertyView(
      UUID id,
      UUID hostId,
      String title,
      String destination,
      String category,
      String description,
      List<String> images,
      List<String> amenities,
      String badge,
      double latitude,
      double longitude,
      int capacity,
      int bedrooms,
      int bathrooms,
      BigDecimal nightlyPrice,
      BigDecimal cleaningFee,
      BigDecimal serviceFee,
      BigDecimal rating,
      int reviewCount,
      String status,
      String hostName) {}
}
