# Wassim Hamouda — Reviews and star ratings

## Your responsibility

You own two-way feedback after a completed accommodation stay: guests review stays/hosts, hosts review visitors, and both can edit or delete their own feedback. You also own property star aggregates, host reputation tags and guest reputation. Accounts are supporting infrastructure; this is your business module. Aymen owns the property catalog, Hadir owns reservations and payments, Rania owns host availability, and Kawther owns guest–host messages.

Source boundaries:

- Backend: `backend/src/main/java/com/stayora/reviews/`
- Frontend: `frontend/src/app/reviews/`
- Migrations: `V5__reviews_and_ratings.sql`, `V8__derive_actual_review_aggregates.sql`, and `V9__two_way_reviews_and_host_tags.sql`. V9 is additive; do not edit applied migrations.
- Backend tests: `backend/src/test/java/com/stayora/ReviewManagementIntegrationTest.java`
- Frontend tests: `*.spec.ts` files in the reviews folder. Shared review presentation is in `review-feed.component.ts`, `reputation.component.ts`, `review-highlight.component.ts` and `review-ui.css`. The hub template is `reviews.component.html`.

The `Review` entity maps to `stayora.reviews`. It stores property, author, reservation and subject UUIDs, `direction` (`STAY` or `GUEST`), rating, body, selected tag IDs and timestamps. `STAY` means a guest reviews a stay and its host; `GUEST` means a host reviews the visitor. V9 backfills historical subjects from property ownership and replaces the old reservation-only unique index with `(reservation_id, direction)`. Historical reservation IDs may remain null.

## Business rules to explain

1. The server derives author, property, direction and subject. Clients supply only the reservation, whole-number stars (1–5), trimmed body (10–2,000 characters) and optional tag IDs.
2. Reviews open on the check-out date of a `CONFIRMED` stay. The guest must own the reservation; a host must own the booked property. Future, pending, declined and cancelled stays are ineligible in both directions.
3. Each reservation permits one review **per direction**. Guest and host may review independently; publication by one side never consumes the other's eligibility.
4. Only the author can edit/delete their review. Hosts cannot edit a guest's opinion, and guests cannot edit feedback written about them.
5. Tags belong exclusively to `STAY` reviews about hosts. Guest reviews written by hosts have stars/body only. `GET /api/reviews/tags` supplies the canonical catalog: Clean/Needs cleaning, Welcoming host/Unwelcoming, Quick replies/Slow replies, Easy check-in/Difficult check-in, As described/Not as described. Each tag has `id`, `label`, `sentiment` (`GOOD`/`BAD`) and `category`.
6. Tags are optional, limited to five, with one selection per category. Unknown IDs, duplicates, contradictory pairs and any tags on a `GUEST` review return 400. Selecting an opposite pill in the UI replaces its counterpart. Counts mean mentions across reviews, not AI-inferred sentiment: `Clean ×2` means two saved reviews selected `clean`.
7. Mutations hold the shared pessimistic property lock. Unique indexes prevent duplicate concurrent submissions. Only `STAY` mutations recalculate the property's `BigDecimal` average/count, with two decimal places and `HALF_UP`. Host-written visitor ratings never affect property scores. Tag/reputation totals are derived on reads, so edits/deletions remove old contributions immediately.
8. Host performance aggregates all reviews addressed to the current host across properties, including retained history. It is all-time and independent of the host dashboard's reporting month. Guest reputation is available to the guest themselves and to hosts with a reservation involving that guest; it is not a public guest directory.

Cross-module calls use `ReservationService.get`, `trips`, `hostRequests` and listing DTOs through `ListingService.get`, `lock`, `updateRating`. Repositories/entities stay module-private. `AccountService` supplies registered-session or development-demo identity.

## APIs and screens

| Method | Endpoint                        | Purpose                                                                                                                |
| ------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/properties/{id}/reviews`  | Public published-property `rating`, `reviewCount`, `reviews`, aggregated `tags`; excludes host-written visitor reviews |
| GET    | `/api/reviews/tags`             | Canonical positive/negative host tag catalog                                                                           |
| GET    | `/api/reviews/eligible`         | Guest's completed stays without their `STAY` review                                                                    |
| GET    | `/api/host/reviews/eligible`    | Owning host's completed stays without their `GUEST` review                                                             |
| GET    | `/api/reviews/mine`             | Current account's authored reviews, for either role                                                                    |
| GET    | `/api/reviews/received`         | Guest's received reputation and host-written reviews                                                                   |
| GET    | `/api/host/reviews`             | Current host's all-time reputation and guest feedback                                                                  |
| GET    | `/api/host/guests/{id}/reviews` | Guest reputation; requires a reservation with the requesting host                                                      |
| POST   | `/api/reviews`                  | Guest creates `{reservationId, rating, body, tags?}`; 201                                                              |
| POST   | `/api/host/reviews`             | Host creates visitor `{reservationId, rating, body}`; 201                                                              |
| PUT    | `/api/reviews/{id}`             | Author updates `{rating, body, tags?}`                                                                                 |
| DELETE | `/api/reviews/{id}`             | Author deletes their review; 204                                                                                       |

`Reputation` returns `rating`, `reviewCount`, `positiveReviews` (4–5 star count), aggregated `tags` (`id`, `label`, `sentiment`, `count`) and `reviews`. Review DTOs include `direction`, `subjectId`, `subjectName`, `propertyTitle`, tag ID array `tags` and display catalog entries `tagDetails`, alongside the original fields. Omitted tags become an empty selection, including on PUT. No pagination is implemented.

Invalid input returns 400, missing authorization 401/403, unknown resources 404 and duplicate reviews 409, using the shared English error envelope.

The guest hub `/reviews` and host hub `/host/reviews` share native platform tokens, cards and responsive layout. Each provides received feedback, stays to review, and authored reviews with edit/delete confirmation. Rating distributions and counted positive/negative pills make host performance visible. Star controls are native keyboard-accessible radios; tag buttons expose pressed state; controls disable while saving and failures retain form content.

Property details embed a rating/tag summary and recent reviews with a full-review link. Host Today highlights all-time reputation and links to the host hub. Host reservation details show visitor reputation. Completed guest trips and host reservation details link to the right hub with `?reservationId=UUID`, automatically opening either a new review or its existing edit form. Host navigation includes Reviews. Highlights load independently and offer retry without blocking the surrounding reservation/property/dashboard.

## AI integration presentation

The contributed `ReviewAiSkill` implements the shared `AiSkill` interface. Its identifier is `review-summary`, and its owner is Wassim Hamouda. The property review page sends only `count=N; average=X.XX` to `/api/ai/assist`. It does not send raw review text, guest names, email addresses, or reservation identifiers.

The system prompt tells the model to summarize aggregate accommodation star counts, avoid invented experiences or quotations, acknowledge limited samples, treat context as data, and require human review. The shared provider supports live execution when configured and deterministic mock fallback when unavailable. The UI labels the returned mode and asks the user to check the summary before sharing. The assistant never rewrites the saved review or decides its star rating.

Explain this limitation honestly: the feature summarizes star statistics, not semantic sentiment of the review bodies. It cannot infer cleanliness, noise, or friendliness from an average alone. No key is required for the offline demonstration. Real provider configuration belongs in ignored backend environment files, never Angular code.

## Software-testing presentation

The integration suite uses disposable PostgreSQL under the `test` profile and asserts that the database name is `stayora_test` before destructive fixture cleanup. It covers:

- create/edit/delete with persisted average and count changes;
- lower/upper rating bounds, short/oversized text, and whitespace-only text;
- completed versus future/pending/declined/cancelled eligibility;
- ownership in both directions and rejection of hosts on the guest creation endpoint;
- independent host/guest reviews, visitor reputation, and unchanged property ratings after host review CRUD;
- tag validation, contradictory/duplicate rejection and counted mentions across create/edit/delete;
- host eligibility and guest-reputation access restrictions;
- duplicate and concurrent duplicate creation;
- decimal averaging and eligible-stay removal after publication;
- deterministic mock AI output and the prompt's non-invention rules.

Frontend tests verify typed HTTP methods/payloads without spoofable author/property fields, whitespace validation, submission locking, opposite-tag replacement, host-mode rendering/submission without pills, and aggregate-only AI input privacy. The English technical report records executed functional checks. The French static-testing report records ESLint analysis of the frontend and does not execute Java or browser tests. Do not claim a tool ran merely because configuration exists.

From the project root run `npm run check`. For only this backend test use `node scripts/backend.mjs -Dspring.profiles.active=test -Dtest=ReviewManagementIntegrationTest test`, with the disposable test PostgreSQL running. Do not point test credentials at Neon.

## Professor demo sequence

1. Select the development guest identity and open `/reviews`.
2. Choose the seeded completed stay, write 10 or more characters, select four or five stars and a positive/negative host tag, then publish.
3. Open the property's reviews. Show that the review count and average match saved rows.
4. Run the rating summary and point to its mock/live label and the aggregate-only payload.
5. Open host Today and Reviews to show the all-time rating and counted pills. Review the same visitor with stars/body; show it in the guest hub and on host reservation details. Property stars remain unchanged by this visitor review.
6. Edit the guest-written stay rating/tags, then reload to show both changed aggregates.
7. Show the integration test that rejects an uncompleted stay and the concurrent duplicate test.
8. Delete the review with confirmation, then show that the stay becomes eligible again.

Only synthetic development data is used in this sequence. Completed demo reservation `20000000-0000-0000-0000-000000000091` belongs to guest `00000000-0000-0000-0000-000000000001`; seeds never overwrite existing records. If the reservation is already reviewed, edit or delete its review before repeating the create step.

## Honest limits and next improvements

Moderation queues, reporting abusive reviews, host public responses, image uploads, pagination, and review email notifications are not implemented. Long-term scale would move average/count aggregation to a repository aggregate query while retaining the same property lock and transaction boundary. Provider-generated output still requires human verification.

## Shared AI provider setup

This module's embedded AI tool and the shared page assistant use Google's native Gemini API. Set `AI_GEMENI_KEY` in the ignored root `.env` and restart the backend. `AI_MODEL` defaults to `gemini-3.5-flash-lite`. The key remains on the backend. Validated model text is `mode: live`; quota, blocked output, key/configuration and connection failures produce a labelled offline response with a specific notice. See [current shared AI setup](README.md#google-gemini-connection-19-october-2026) and [provider configuration](../ai-prompts.md#backend-only-configuration-examples).

## AI response formatting (16 October 2026)

The rating summary now uses `AiMarkdownComponent` for formatted response text. Review bodies remain ordinary user text. The shared floating assistant uses the same renderer.

## Responsive layout update (16 October 2026)

Review star controls now share available width so all five fit the 320 px review editor. Rating progress bars can shrink in narrow cards. Guest review editing, star selection, host reviews and public property reviews are included in the responsive checks; no review was published during these checks.

## Expanded demo database (16 October 2026)

The expanded seed adds 50 stay reviews with positive/negative host tags and 36 host-written guest reviews with empty tags. All link to completed confirmed stays and correct authors/subjects. Ratings/count caches are derived from these reviews. Four stay reviews and 18 host guest-reviews remain open for eligibility demonstrations. See [seed data](../seed-data.md).

Populated rating distributions exposed wrapping of star labels and multi-digit counts. Rating-bar labels now keep their intrinsic width, while the progress track takes the remaining space. Desktop/mobile host review screenshots verify this with the populated data. Frontend verification passed 39 tests, lint and production build.
