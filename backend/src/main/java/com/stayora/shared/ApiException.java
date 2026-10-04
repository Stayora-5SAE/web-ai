package com.stayora.shared;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {
  public final HttpStatus status;

  public ApiException(HttpStatus status, String message) {
    super(message);
    this.status = status;
  }

  public static ApiException badRequest(String message) {
    return new ApiException(HttpStatus.BAD_REQUEST, message);
  }

  public static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "The requested record was not found.");
  }

  public static ApiException forbidden() {
    return new ApiException(
        HttpStatus.FORBIDDEN, "You do not have permission to access this action.");
  }

  public static ApiException unauthorized(String message) {
    return new ApiException(HttpStatus.UNAUTHORIZED, message);
  }

  public static ApiException conflict(String message) {
    return new ApiException(HttpStatus.CONFLICT, message);
  }
}
