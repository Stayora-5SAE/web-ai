package com.stayora.listings;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record PropertyRequest(
    @NotBlank @Size(max = 180) String title,
    @NotBlank @Size(max = 120) String destination,
    @NotBlank @Size(max = 40) String category,
    @NotBlank @Size(max = 6000) String description,
    @NotNull @Size(min = 1, max = 12) List<@NotBlank @Size(max = 2048) String> images,
    @NotNull @Size(max = 30) List<@NotBlank @Size(max = 80) String> amenities,
    @DecimalMin("-90") @DecimalMax("90") double latitude,
    @DecimalMin("-180") @DecimalMax("180") double longitude,
    @Min(1) @Max(20) int capacity,
    @Min(0) @Max(30) int bedrooms,
    @Min(1) @Max(30) int bathrooms,
    @NotNull @DecimalMin("0.001") @Digits(integer = 9, fraction = 3) BigDecimal nightlyPrice,
    @NotNull @DecimalMin("0") @Digits(integer = 9, fraction = 3) BigDecimal cleaningFee,
    @NotNull @DecimalMin("0") @Digits(integer = 9, fraction = 3) BigDecimal serviceFee,
    @NotBlank String status) {}
