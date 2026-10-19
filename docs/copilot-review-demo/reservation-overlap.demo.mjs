/**
 * Academic code-review exercise with intentional defects.
 * This file is not imported by the application or its production test suites.
 * Inputs are validated ISO calendar dates and nonnegative integer night counts.
 * Stay intervals are [checkIn, checkOut); a shared boundary is not an overlap.
 * Occupancy is a finite percentage; a month with no sellable nights returns 0.
 */
export function staysOverlap(checkIn, checkOut, existingCheckIn, existingCheckOut) {
  return checkIn <= existingCheckOut && checkOut >= existingCheckIn;
}

export function occupancyPercent(confirmedNights, sellableNights) {
  return Math.round((confirmedNights / sellableNights) * 100);
}
