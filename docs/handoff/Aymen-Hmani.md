# Aymen Hmani — Properties and discovery

Your business module is the actual accommodation catalogue: hosts describe spaces, publish them, and guests discover suitable properties before booking. Accounts are shared authentication infrastructure and do not count as your business module. Wassim owns reviews and star ratings; this module only exposes their aggregated property rating.

## Implementation map

- Backend package: `com.stayora.listings`.
- Frontend feature: `frontend/src/app/listings`.
- Persistent entities: `stayora.properties`, including owner ID, descriptive facts, photos, amenities, location, capacity, prices, visibility and archive flag; `stayora.wishlist_entries`, a guest-owned saved-property relation with a unique account/property constraint. These are two business entities, separate from shared accounts.
- Migration: `V2__property_management.sql`, additive to the existing baseline.
- Services: `ListingService` provides public property DTOs and the transaction-scoped property lock. `PropertyManagementService` owns creation, editing, ownership checks and safe archival. `ListingManagementService` is the typed Angular write client.
- Main UI: `/explore`, `/search`, `/properties/:id`, `/wishlists`, `/host/listings`, `/host/listings/new`, `/host/listings/:id/edit`.

Keep `ListingService.get`, `lock`, `published`, `forHost`, and `PropertyView` compatible with reservation and calendar consumers. Cross-module calls return IDs and DTOs; there are no shared JPA associations. The management service queries reservation facts through `ReservationService.forProperty`, rather than accessing another module's table directly.

## APIs to explain

| Method and path                                  | Behavior                                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/properties`                            | Published discovery with destination, category, capacity, paired dates, and inclusive `minPrice`/`maxPrice` nightly TND filters |
| `GET /api/properties/{id}`                       | Public details; unpublished owner previews are authorized; archived listings are hidden                                         |
| `POST /api/host/properties`                      | Create a host-owned draft or published property; owner ID is taken from the authenticated account                               |
| `GET /api/host/properties/{id}`                  | Owner-only editor data, including archived records                                                                              |
| `PUT /api/host/properties/{id}`                  | Owner-only full update of editable facts; does not change rating, owner or reservation prices                                   |
| `DELETE /api/host/properties/{id}`               | Idempotent soft archive, retaining reservation history                                                                          |
| `GET /api/wishlists`                             | The current guest's saved published properties                                                                                  |
| `PUT /api/wishlists/{propertyId}`                | Idempotently save a published property for the current guest                                                                    |
| `DELETE /api/wishlists/{propertyId}`             | Idempotently remove only the current guest's saved entry                                                                        |
| `POST /api/ai/assist` with `listing-description` | Generate a suggested description; saving requires host review                                                                   |

Write fields: `title`, `destination`, `category`, `description`, `images`, `amenities`, `latitude`, `longitude`, `capacity`, `bedrooms`, `bathrooms`, `nightlyPrice`, `cleaningFee`, `serviceFee`, `status`. Categories are Apartments, Houses, Guesthouses / Dars, and Coastal Escapes. Visibility values accepted on writes are `DRAFT` and `PUBLISHED`. Reads can also return `ARCHIVED`.

## Business rules and software testing talking points

1. Only hosts create properties; only the owner reads editor data, edits, or archives. Supplying another `hostId` in JSON does not transfer ownership.
2. Capacity is 1–20; bedrooms are 0–30; bathrooms are 1–30; latitude/longitude must be finite and inside geographical bounds.
3. Nightly price is positive. All TND prices use decimal arithmetic with at most three fractional digits; fees are non-negative.
4. Photos accept HTTP/HTTPS URLs with a host and no embedded credentials. Script/data/relative URLs and the storage separator are rejected. No server-side image fetching is performed.
5. Capacity cannot be reduced below the guest count of an upcoming active reservation. Listing repricing never rewrites already agreed reservation prices.
6. Archival is rejected while future pending or confirmed stays exist. Soft archival preserves the property row, reviews and booking history; it hides discovery and prevents new booking quotes.
7. Mutation and reservation creation acquire the same pessimistic property lock, preventing a booking from racing with an unsafe archive or capacity edit.
8. Wishlists are persisted in PostgreSQL, scoped to the current guest, and never accept a caller-supplied account ID. A unique account/property constraint and `ON CONFLICT DO NOTHING` prevent duplicate saves, including concurrent requests. Archived and draft properties are hidden from saved results.

Be ready to distinguish **validation** (400), **authentication/ownership** (401/403), **missing public data** (404), and **business conflict** (409). Client validation helps the user; the server remains authoritative. Angular explicitly shows loading, API errors, archive confirmation and invalid fields. The editor blocks duplicate submission.

Focused automated tests:

- `ListingManagementIntegrationTest`: create/publish and exact decimal price filtering; host ownership and forged-owner rejection; unsafe URL, category, range and money rejection; archive idempotency/history; active booking constraints and unchanged historical price; idempotent persistent guest-scoped wishlists.
- `ListingAiSkillTest`: stable offline output, skill identity/owner, and a prompt requiring facts and host review.
- `listing-management.service.spec.ts`: typed owner endpoint payloads and archive conflict propagation.
- `listing-editor.component.spec.ts`: description text is unchanged until explicit application; AI receives only sanitized listing facts.
- `wishlist.service.spec.ts`: coalesced card loading, save/removal only after successful API response, and stale account cache isolation after identity switching.

Integration tests assert `current_database() = stayora_test` before touching test data and remove only properties they created. They must run against disposable PostgreSQL, never Neon. Follow the root README for combined commands and the English technical report for executed functional results. The separate French report records frontend static analysis; test presence alone is not evidence that a test passed.

## AI integration explanation

`ListingAiSkill` registers `listing-description` in the shared assistant. The embedded editor button calls the same `/api/ai/assist` interface and shared provider routing. Thus the feature and the assistant share one business-owned skill.

The prompt instructs the model to treat facts as data, write concise English plain text, use only supplied destination/category/capacity/bedrooms/amenities, and avoid inventing accessibility, safety, review or distance claims. No guest profile, reservation contact, password, or credential is included. The editor strips markup from destination/amenity facts and limits their lengths before sending them; the shared AI service applies its own validation/redaction and provider limits.

The deterministic offline response is clearly labeled by the shared `mode`. A real provider uses server-side configuration only. An AI draft is displayed separately from the saved description; the host clicks **Apply reviewed draft**, reviews the form, then **Save listing**. AI cannot publish a property or change pricing autonomously.

For the AI professor: explain prompt ownership, grounded inputs, deterministic fallback, provider isolation, human confirmation, privacy, and how a malformed or unavailable provider yields a visible error without discarding form edits. This is description assistance, not proof that model facts are accurate.

## Demonstration sequence

1. Use the local development host identity or a real registered host account.
2. Open Your Listings → Create listing. Fill accurate photos, amenities, location and capacity; save as Draft.
3. Show that the draft is absent from guest discovery.
4. Edit it, request an AI suggestion, show the original description remains unchanged, then apply the reviewed draft and publish.
5. Search by destination, capacity, and the exact nightly price. Open its property details and map marker.
6. Book through the reservation module; show capacity reduction and archival are refused while that future booking remains active.
7. Use another host to demonstrate ownership rejection. After future active reservations are resolved, archive a disposable listing and show that it is hidden publicly but retained in the Archived tab.

## Known limits

Photo uploads/CDN storage are outside this module; hosts provide URLs and must have the right to use those images. External image hosts can fail independently. Discovery currently filters the small academic catalogue in memory; large deployments should add paginated SQL specifications and relevant indexes. Existing photo/amenity storage uses a separator for compatibility; input validation prevents separator injection. Financial reservation changes belong to the reservations module, availability blocks belong to the host operations module, and reviews/stars belong to Wassim.

## Review integration contract

Property details now embed Wassim's `ReviewHighlightComponent` with `propertyId`, showing persisted guest stars, recent reviews, and counted host feedback pills, plus the full review page link. The public review API returns `STAY` feedback only; host-written visitor ratings must never enter property averages or discovery sorting. `ReviewService` continues to update catalog aggregates through `ListingService.updateRating` under the shared property lock. Review components own their loading/error/retry state and use platform tokens. V9 adds two-way reviews and tags; Aymen does not own their validation or aggregation.

## Shared AI provider setup

This module's embedded AI tool and its skill in the shared assistant use the same OpenRouter backend connection. Replace `OPENROUTER_API_KEY` in ignored root `.env` and restart the backend; `AI_MODEL` selects the model (`google/gemma-4-26b-a4b-it:free` by default). No provider key belongs in the frontend. Successful validated output is `mode: live`; missing/placeholder keys and provider failures remain explicitly labeled offline with a visible notice. Tests use controlled providers/mock mode and do not prove a live-key round trip. See [shared AI setup](README.md#shared-openrouter-connection-16-october-2026) and [provider configuration](../ai-prompts.md#backend-only-configuration-examples).

The shared provider now fails over in order from Gemma 26B to Gemma 31B to Cohere North Mini Code when OpenRouter cannot serve the selected model. The same sanitized module prompt is used throughout. `AI_FALLBACK_MODELS` configures backups, and `model` in the AI response identifies the actual answering model. A backup can produce a live result; exhaustion still returns an explicitly labeled offline example. See [ordered failover](README.md#ordered-free-model-failover).

## AI response formatting (16 October 2026)

The listing AI suggestion now uses `AiMarkdownComponent` for a formatted preview in place of the read-only textarea. The original draft text is still copied into the editable description only when the user applies it.

## Responsive layout update (16 October 2026)

Responsive fixes add shrinkable equal-width search/booking date fields, stack them below 380 px, let property-card actions wrap, and wrap host listing filters. Listing editor textareas use 16 px type. Guest discovery, search, property details, checkout and listing management were checked at phone, tablet and desktop widths.

## Expanded demo database (16 October 2026)

The shared development seed now adds 20 Tunisian demo properties (18 published), five-photo galleries, synthetic host/guest profiles and six saved stays. Original seed design images are replaced only when unchanged; custom photos and content survive. Read [seed data and photo credits](../seed-data.md).
