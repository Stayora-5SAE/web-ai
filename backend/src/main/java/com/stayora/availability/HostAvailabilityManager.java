package com.stayora.availability;

import com.stayora.accounts.AccountService;
import com.stayora.listings.ListingService;
import com.stayora.reservations.ReservationService;
import com.stayora.shared.ApiException;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Owns host mutations; AvailabilityService stays independent of reservations to avoid a cycle. */
@Service
public class HostAvailabilityManager {
  private final AccountService accounts;
  private final ListingService listings;
  private final ReservationService reservations;
  private final AvailabilityRepository blocks;
  private final NightlyPriceRepository prices;
  @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;

  public HostAvailabilityManager(
      AccountService accounts,
      ListingService listings,
      ReservationService reservations,
      AvailabilityRepository blocks,
      NightlyPriceRepository prices) {
    this.accounts = accounts;
    this.listings = listings;
    this.reservations = reservations;
    this.blocks = blocks;
    this.prices = prices;
  }

  private void lockOwned(UUID propertyId) {
    UUID host = accounts.requireRole("HOST").id();
    if (!listings.lock(propertyId).hostId().equals(host)) throw ApiException.forbidden();
  }

  private void dates(LocalDate start, LocalDate end) {
    if (start == null
        || end == null
        || start.isBefore(LocalDate.now())
        || !end.isAfter(start)
        || ChronoUnit.DAYS.between(start, end) > 365
        || end.isAfter(LocalDate.now().plusYears(2)))
      throw ApiException.badRequest(
          "Use future dates, an exclusive end date, and a range of 1–365 days within two years.");
  }

  private void noBooking(UUID propertyId, LocalDate start, LocalDate end) {
    if (reservations.forProperty(propertyId).stream()
        .anyMatch(
            r ->
                ("PENDING".equals(r.status()) || "CONFIRMED".equals(r.status()))
                    && r.checkIn().isBefore(end)
                    && r.checkOut().isAfter(start)))
      throw ApiException.conflict("An active reservation already holds these dates.");
  }

  @Transactional
  public AvailabilityService.BlockView saveBlock(UUID id, BlockRequest request) {
    lockOwned(request.propertyId());
    dates(request.startDate(), request.endDate());
    AvailabilityBlock block =
        id == null
            ? new AvailabilityBlock()
            : blocks.findById(id).orElseThrow(ApiException::notFound);
    if (id != null) {
      entityManager.refresh(block);
      if (!block.propertyId.equals(request.propertyId())) throw ApiException.forbidden();
    }
    noBooking(request.propertyId(), request.startDate(), request.endDate());
    if (blocks.findByPropertyId(request.propertyId()).stream()
        .anyMatch(
            b ->
                !b.id.equals(id)
                    && b.startDate.isBefore(request.endDate())
                    && b.endDate.isAfter(request.startDate())))
      throw ApiException.conflict("An owner block already covers these dates.");
    block.id = id == null ? UUID.randomUUID() : id;
    block.propertyId = request.propertyId();
    block.startDate = request.startDate();
    block.endDate = request.endDate();
    block.reason = request.reason().trim();
    blocks.saveAndFlush(block);
    return new AvailabilityService.BlockView(
        block.id, block.startDate, block.endDate, block.reason);
  }

  @Transactional
  public void deleteBlock(UUID id) {
    AvailabilityBlock block = blocks.findById(id).orElseThrow(ApiException::notFound);
    lockOwned(block.propertyId);
    entityManager.refresh(block);
    blocks.delete(block);
    blocks.flush();
  }

  @Transactional
  public AvailabilityService.PriceView savePrice(UUID id, PriceRequest request) {
    lockOwned(request.propertyId());
    dates(request.date(), request.date() == null ? null : request.date().plusDays(1));
    noBooking(request.propertyId(), request.date(), request.date().plusDays(1));
    NightlyPrice price =
        id == null ? new NightlyPrice() : prices.findById(id).orElseThrow(ApiException::notFound);
    if (id != null) {
      entityManager.refresh(price);
      if (!price.propertyId.equals(request.propertyId())) throw ApiException.forbidden();
    }
    prices
        .findByPropertyIdAndDate(request.propertyId(), request.date())
        .ifPresent(
            existing -> {
              if (!existing.id.equals(id))
                throw ApiException.conflict(
                    "A price override already exists for this date. Edit or remove it first.");
            });
    price.id = id == null ? UUID.randomUUID() : id;
    price.propertyId = request.propertyId();
    price.date = request.date();
    price.nightlyPrice = request.nightlyPrice().setScale(3, RoundingMode.UNNECESSARY);
    prices.saveAndFlush(price);
    return new AvailabilityService.PriceView(price.id, price.date, price.nightlyPrice);
  }

  @Transactional
  public void deletePrice(UUID id) {
    NightlyPrice price = prices.findById(id).orElseThrow(ApiException::notFound);
    lockOwned(price.propertyId);
    entityManager.refresh(price);
    noBooking(price.propertyId, price.date, price.date.plusDays(1));
    prices.delete(price);
    prices.flush();
  }

  public record BlockRequest(
      @NotNull UUID propertyId,
      @NotNull LocalDate startDate,
      @NotNull LocalDate endDate,
      @NotBlank @Size(max = 120) String reason) {}

  public record PriceRequest(
      @NotNull UUID propertyId,
      @NotNull LocalDate date,
      @NotNull @DecimalMin("0.001") @DecimalMax("100000") @Digits(integer = 6, fraction = 3)
          BigDecimal nightlyPrice) {}
}
