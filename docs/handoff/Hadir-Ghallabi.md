# Hadir Ghallabi — Reservations and simulated payments

## Business responsibility

This module owns the rental transaction after a guest selects a property: authoritative quotes, booking requests, guest trip history, host request decisions, cancellations, and simulated payment receipts. Accounts are a shared technical dependency and are not counted as Hadir's business module.

## Owned implementation

- Backend package: `com.stayora.reservations`.
- Tables: `stayora.reservations`, `stayora.reservation_payments`.
- Migration: `V3__reservation_payments.sql` extends existing reservation state constraints and adds the simulation ledger. It preserves previous price snapshots and backfills existing reservations.
- REST controller: `ReservationController`; host acceptance/decline is exposed by the availability module's host controller through `ReservationService.decide`.
- Frontend: review/confirmation, guest trips and detail, host request list and host reservation detail, typed `ReservationApiService`.
- Routes: `/reservations/review`, `/trips`, `/trips/:id`, `/host/reservations`, `/host/reservations/:id`.

## REST contract

| Endpoint                                   | Purpose                                                       | Authorization              |
| ------------------------------------------ | ------------------------------------------------------------- | -------------------------- |
| `POST /api/reservations/quote`             | Compute an authoritative TND quote                            | Property must be published |
| `POST /api/reservations`                   | Create a pending reservation and simulated payment atomically | Guest                      |
| `GET /api/reservations`                    | Guest's trip history                                          | Guest                      |
| `GET /api/reservations/host`               | All requests on host's properties                             | Host                       |
| `GET /api/reservations/{id}`               | Reservation snapshot                                          | Guest or owning host       |
| `GET /api/reservations/{id}/payment`       | Simulated receipt                                             | Guest or owning host       |
| `PATCH /api/reservations/{id}/cancel`      | Final cancellation with reason                                | Reservation guest          |
| `PATCH /api/host/reservations/{id}/status` | Accept or decline pending request                             | Owning host                |

Creation accepts only `propertyId`, `checkIn`, `checkOut`, and `guests`. Client price fields have no authority. Cancellation accepts `{ "reason": "Plans changed" }`. Receipt fields include amount, TND currency, simulation mode, captured/refunded status, reference, and timestamps. No card fields exist. Legacy seeded reservations without a ledger return a clearly simulated receipt derived from their immutable reservation snapshot; newly created reservations always persist their payment ledger.

## Rules to explain to the software testing professor

1. Dates use a half-open interval `[checkIn, checkOut)`: adjacent stays are allowed; overlapping pending or confirmed stays are blocked. A stay lasts 1–90 nights and capacity is checked on the server.
2. Creation acquires a pessimistic database lock on the property before checking availability. Two concurrent requests serialize, so only one overlapping request succeeds. Availability and host decisions use the same lock boundary.
3. `PENDING → CONFIRMED` or `PENDING → DECLINED` is allowed for the owning host while check-in has not passed. A decided request cannot be decided again.
4. The reservation guest may cancel `PENDING` or `CONFIRMED` only before check-in, with a trimmed reason of 3–500 characters. `CANCELLED` and `DECLINED` release dates; both produce a full simulated refund. Cancellation is final.
5. Prices are Java `BigDecimal`, PostgreSQL `numeric(12,3)`, and TND with three decimal places. Date-specific host prices are included in the accommodation subtotal. Booking persists an immutable price snapshot, so later listing prices do not alter the receipt.
6. Cancellation and host decision reload the reservation after obtaining the property lock. This prevents a concurrent decision from acting on stale state.
7. `eligibleForReview(reservationId, guestId)` is an ID-based service boundary: only the reservation guest of a confirmed stay whose checkout has passed can write a review. Other modules do not share this module's JPA entities.

## Tests and static analysis participation

`ReservationLifecycleIntegrationTest` verifies persisted cancellation/refund, released dates, invalid repeated transitions, host cancellation denial, short reasons, check-in cutoff, immutable ledger totals, list role checks, absence of card fields, and deterministic itinerary advice. Existing `BookingIntegrationTest` additionally verifies decimal totals, forged prices, overlaps, adjacent dates, capacity, owner blocks, host ownership, and concurrent bookings.

Frontend tests in `reservation-api.service.spec.ts` verify the cancellation body contains only a reason and errors propagate. `trip-detail.component.spec.ts` verifies explicit cancellation consent and duplicate-click prevention. Existing checkout tests protect agreement and duplicate submission. These are behavioral tests; the French static-analysis deliverable separately covers syntax, style, lint and maintainability evidence. Be able to show the exact source and real command output rather than describing static analysis as a booking simulation.

## AI integration talking points

`ReservationAiSkill` implements the common `AiSkill` interface with skill ID `reservation-itinerary`, owner Hadir Ghallabi. The trip detail page sends destination, dates and party size; it sends no guest names, email, payment references or access codes. The system prompt forbids fabricated bookings, prices and physical access information. The deterministic mock keeps development and tests reproducible. The shared provider can invoke the same skill in live mode when the configured credentials exist. Both modes present advice; neither creates bookings or charges.

## Suggested demonstration

1. Sign in or use the development guest identity. Choose a property, dates and guests; review the server quote and create a simulated request.
2. Open **Your trips**, inspect the persisted receipt, and request an AI itinerary.
3. Switch to the owning host and open the complete requests list. Accept or decline and refresh to show persisted state.
4. For an upcoming accepted stay, return to the guest trip, explicitly confirm cancellation, and show the refunded receipt. Search the same dates to prove availability was released.
5. Explain that payment processing is deliberately simulated, with no card collection or external payment key required. A future provider adapter must preserve authorization, immutable server totals, idempotency and explicit simulation/live labeling.

## Maintenance boundaries

Do not directly edit another member's JPA entities. Use `ListingService` for catalog facts/property locking, `AvailabilityService` for blocks and nightly totals, `AccountService` for the caller and roles, and the shared AI interface for provider access. Do not weaken cancellation/ownership rules in Angular: the server is the authority. Add a new numbered Flyway migration for database changes; never modify an applied migration. Keep secrets in ignored backend environment files and keep the UI/documentation in English; only the requested static-analysis report is French.

## Two-way review integration

Completed confirmed stays link directly into Wassim's review hubs: guest trip cards/details use `/reviews?reservationId=UUID`, and host reservation details use `/host/reviews?reservationId=UUID`. The hub opens either an eligible review form or the author's existing review for editing. Host reservation details also embed visitor reputation via `GET /api/host/guests/{guestId}/reviews`, accessible only to a host with a reservation involving that guest. Guests see host-written feedback in their own `/reviews` hub.

A reservation permits one guest-to-stay (`STAY`) and one host-to-visitor (`GUEST`) review independently, beginning on its check-out date when confirmed. Host-written visitor reviews use stars and text only; positive/negative tags belong exclusively to guest-written feedback about hosts. Neither reviews nor their edits change reservation state, immutable totals or simulated payments. Server-side review eligibility/ownership and uniqueness are owned by Wassim, rather than inferred from button visibility. V9 replaces reservation-only review uniqueness with `(reservation_id, direction)`.

## Shared AI provider setup

This module's embedded AI tool and its skill in the shared assistant use the same OpenRouter backend connection. Replace `OPENROUTER_API_KEY` in ignored root `.env` and restart the backend; `AI_MODEL` selects the model (`google/gemma-4-26b-a4b-it:free` by default). No provider key belongs in the frontend. Successful validated output is `mode: live`; missing/placeholder keys and provider failures remain explicitly labeled offline with a visible notice. Tests use controlled providers/mock mode and do not prove a live-key round trip. See [shared AI setup](README.md#shared-openrouter-connection-16-october-2026) and [provider configuration](../ai-prompts.md#backend-only-configuration-examples).

The shared provider now fails over in order from Gemma 26B to Gemma 31B to Cohere North Mini Code when OpenRouter cannot serve the selected model. The same sanitized module prompt is used throughout. `AI_FALLBACK_MODELS` configures backups, and `model` in the AI response identifies the actual answering model. A backup can produce a live result; exhaustion still returns an explicitly labeled offline example. See [ordered failover](README.md#ordered-free-model-failover).

## AI response formatting (16 October 2026)

The trip itinerary now uses `AiMarkdownComponent` for formatted headings, lists and emphasis. The itinerary remains advisory and preserves the live/offline label and provider notice.

## Responsive layout update (16 October 2026)

Trip and reservation layouts now allow grid children and long text to shrink/wrap. Narrow reservation details can stack their property image and wrap dates/status; shared mobile controls have larger touch targets. Guest trip list/detail and checkout are included in the responsive route sweep.

## Expanded demo database (16 October 2026)

The expanded seed adds 68 reservations: 54 completed, 12 upcoming, one cancelled and one declined. Every reservation has a simulated receipt, and four completed stays remain eligible for guest stay reviews. Repeat seeding preserves original booking dates and price snapshots. See [seed data](../seed-data.md).
