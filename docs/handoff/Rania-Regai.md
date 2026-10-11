# Rania Regai — Availability, pricing and host operations

Your business module owns the operational calendar and pricing decisions for host properties. Accounts are shared infrastructure and do not count as your business module. Property descriptions and reviews belong to Aymen and Wassim; reservation state and simulated payments belong to Hadir.

## What is implemented

- Owner-authorized availability block creation, editing, removal and calendar display. Dates are start-inclusive and end-exclusive, so adjacent stays remain possible.
- Per-date nightly price override creation, editing and removal. Unspecified dates use the property's base price. All amounts use three fractional digits in TND. The reservation service uses `AvailabilityService.accommodationTotal` to calculate authoritative totals.
- Host dashboard computed from persisted reservations and blocks: published properties, confirmed nights, sellable nights, occupancy, pending requests and simulated payout.
- Host summary AI skill, contributed to the shared AI interface. Offline behavior is deterministic and explicitly identified as mock mode. Optional provider mode belongs to the shared AI configuration. The UI sends only aggregate business counts and amounts, without guest identities or raw reservations. AI cannot mutate prices, availability or bookings.

## Code and data ownership

Backend: `com.stayora.availability`. Frontend: `frontend/src/app/availability`. Tables: `stayora.availability_blocks` and `stayora.nightly_prices`. Migration: `V4__availability_pricing.sql`. Main screens: `/host/calendar` and `/host/today`.

`AvailabilityService` exposes read interfaces used by search and reservations. `HostAvailabilityManager` owns transactional mutations and depends on reservation read interfaces. Keeping these services separate prevents a circular dependency.

Endpoints:

| Method              | URL                                        | Behavior                                                  |
| ------------------- | ------------------------------------------ | --------------------------------------------------------- |
| GET                 | `/api/host/calendar?propertyId=UUID`       | Owned property's reservations, blocks and price overrides |
| GET                 | `/api/host/dashboard?month=YYYY-MM`        | Persisted business metrics                                |
| POST / PUT / DELETE | `/api/host/availability/blocks[/{id}]`     | Create, change or remove an owner block                   |
| POST / PUT / DELETE | `/api/host/availability/prices[/{id}]`     | Create, change or remove a daily price                    |
| POST                | `/api/ai/assist` with skill `host-summary` | Aggregate host advice; explicit AI mode                   |

Block payload: `propertyId`, `startDate`, `endDate`, `reason`. Price payload: `propertyId`, `date`, `nightlyPrice`. PUT requires the existing ID. DELETE has no body. API errors use the application's consistent error object.

## Business rules to explain

1. Every mutation checks the caller's host role and property ownership on the server. A client-selected property ID is never sufficient authorization.
2. A pessimistic property lock serializes host calendar/price mutations with reservation creation. An overlapping active booking and an owner block cannot both succeed concurrently.
3. Owner blocks cannot overlap pending or confirmed bookings or another block. Checkout/end dates are exclusive. Pending requests hold nights until decided or cancelled.
4. Date edits require a future range of 1–365 days within two years. Reasons are required and limited to 120 characters.
5. Daily prices must be positive, at most 100000 TND, and have at most three fractional digits. A property can have only one override per date. Active booked dates cannot receive changed prices; stored reservation totals are immutable snapshots.
6. Occupancy is confirmed nights divided by sellable nights of published properties during the chosen month. Owner-blocked nights are excluded from the denominator. Pending nights are not counted as confirmed occupancy.
7. Payout is accommodation plus cleaning fees for confirmed reservations checking in during the selected month. It is a simulated accounting metric, not a bank transfer or recognized daily revenue.

## Demonstration before the professors

Choose the host identity, open the calendar, select an available future date, and save a short maintenance block. Switch to guest search for overlapping dates to show exclusion, then remove the block. Add a price override such as 200.125 TND and show that the guest quote uses that price for only the edited night. Create a guest request and return to host mode: show its pending hold, accept it, and observe the dashboard. Explain the exclusive checkout boundary and how the property lock prevents concurrent races. Select the appropriate reporting month because a booking outside the month does not affect its occupancy.

Generate a host summary and show the reported mode. Explain the shared `AiSkill` interface, the module-owned system prompt, deterministic offline response, aggregate-only context and human-review requirement. Missing provider credentials never block the application: the response remains mock mode. Suggestions are advisory, never autonomous mutations.

## Testing evidence and categories

`AvailabilityManagementIntegrationTest` uses disposable PostgreSQL, asserts the test database name before destructive cleanup, and covers block CRUD, adjacency, invalid date/decimal limits, foreign ownership, duplicate prices, authoritative quote integration, active-booking conflicts, concurrent block-versus-reservation races, occupancy denominator and deterministic AI output. `calendar.component.spec.ts` covers exclusive date boundaries and override display, duplicate-click protection and retained input on API failure. These are dynamic functional/integration tests; they must not be mislabeled as static analysis in the French testing report. Static analysis and its recorded results are documented separately by the coordinator.

Run the root documented verification commands. Do not use the shared Neon database for integration cleanup. The coordinator records the actual test counts and run results after all modules are integrated; this document describes coverage rather than claiming an unexecuted run.

## Limits and future changes

There is no demand forecast, autonomous dynamic pricing, external channel-manager sync, real payout or physical smart lock. The calendar and base pricing are authoritative only inside Stayora. Payout follows a check-in-month convention rather than accrual accounting. Human hosts remain responsible for availability and reviewing AI recommendations. Preserve module boundaries, three-digit decimal precision, locking and ownership checks when extending the module.
