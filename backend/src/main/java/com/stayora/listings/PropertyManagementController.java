package com.stayora.listings;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/host/properties")
public class PropertyManagementController {
  private final PropertyManagementService properties;

  public PropertyManagementController(PropertyManagementService properties) {
    this.properties = properties;
  }

  @GetMapping("/{id}")
  public ListingService.PropertyView get(@PathVariable UUID id) {
    return properties.owned(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ListingService.PropertyView create(@Valid @RequestBody PropertyRequest request) {
    return properties.create(request);
  }

  @PutMapping("/{id}")
  public ListingService.PropertyView update(
      @PathVariable UUID id, @Valid @RequestBody PropertyRequest request) {
    return properties.update(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void archive(@PathVariable UUID id) {
    properties.archive(id);
  }
}
