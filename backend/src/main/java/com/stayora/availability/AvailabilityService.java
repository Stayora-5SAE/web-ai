package com.stayora.availability;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AvailabilityService {
  private final AvailabilityRepository blocks;
  private final NightlyPriceRepository prices;

  public AvailabilityService(AvailabilityRepository blocks, NightlyPriceRepository prices) {
    this.blocks = blocks;
    this.prices = prices;
  }

  public boolean blocked(UUID propertyId, LocalDate start, LocalDate end) {
    return blocks.existsByPropertyIdAndStartDateLessThanAndEndDateGreaterThan(
        propertyId, end, start);
  }

  public List<BlockView> forProperty(UUID propertyId) {
    return blocks.findByPropertyId(propertyId).stream()
        .sorted(java.util.Comparator.comparing(b -> b.startDate))
        .map(b -> new BlockView(b.id, b.startDate, b.endDate, b.reason))
        .toList();
  }

  public BigDecimal priceFor(UUID propertyId, LocalDate date, BigDecimal fallbackNightly) {
    return prices
        .findByPropertyIdAndDate(propertyId, date)
        .map(p -> p.nightlyPrice)
        .orElse(fallbackNightly)
        .setScale(3, RoundingMode.HALF_UP);
  }

  public BigDecimal accommodationTotal(
      UUID propertyId, LocalDate start, LocalDate end, BigDecimal fallbackNightly) {
    var overrides =
        prices
            .findByPropertyIdAndDateGreaterThanEqualAndDateLessThan(propertyId, start, end)
            .stream()
            .collect(java.util.stream.Collectors.toMap(p -> p.date, p -> p.nightlyPrice));
    return start
        .datesUntil(end)
        .map(date -> overrides.getOrDefault(date, fallbackNightly))
        .reduce(BigDecimal.ZERO, BigDecimal::add)
        .setScale(3, RoundingMode.HALF_UP);
  }

  public List<PriceView> prices(UUID propertyId) {
    return prices.findByPropertyIdOrderByDate(propertyId).stream()
        .map(p -> new PriceView(p.id, p.date, p.nightlyPrice))
        .toList();
  }

  public record PriceView(UUID id, LocalDate date, BigDecimal nightlyPrice) {}

  public record BlockView(UUID id, LocalDate startDate, LocalDate endDate, String reason) {}
}
