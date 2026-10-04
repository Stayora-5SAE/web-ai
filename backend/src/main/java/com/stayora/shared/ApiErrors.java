package com.stayora.shared;

import jakarta.validation.ConstraintViolationException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiErrors {
  private static final Logger LOG = LoggerFactory.getLogger(ApiErrors.class);

  @ExceptionHandler(ApiException.class)
  ResponseEntity<Map<String, Object>> expected(ApiException e) {
    return ResponseEntity.status(e.status)
        .body(Map.of("status", e.status.value(), "message", e.getMessage()));
  }

  @ExceptionHandler({
    MethodArgumentNotValidException.class,
    ConstraintViolationException.class,
    MethodArgumentTypeMismatchException.class,
    HttpMessageNotReadableException.class
  })
  ResponseEntity<Map<String, Object>> invalid(Exception e) {
    String message =
        e instanceof MethodArgumentNotValidException validation
            ? validation.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .findFirst()
                .orElse("Invalid request.")
            : "Invalid request. Check dates, identifiers, and field values.";
    return ResponseEntity.badRequest().body(Map.of("status", 400, "message", message));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String, Object>> unexpected(Exception e) {
    LOG.error("API request failed ({})", e.getClass().getSimpleName());
    return ResponseEntity.internalServerError()
        .body(
            Map.of(
                "status", 500, "message", "The request could not be completed. Please try again."));
  }
}
