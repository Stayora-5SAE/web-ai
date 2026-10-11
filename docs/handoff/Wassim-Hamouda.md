# Wassim Hamouda — Reviews and star ratings

## Your responsibility

You own guest feedback after a completed accommodation stay: publishing, editing, deleting, and displaying reviews, plus recalculating the property's average rating. Accounts are supporting infrastructure; this is your business module. Aymen owns the property catalog, Hadir owns reservations and payments, Rania owns host availability, and Kawther owns guest–host messages.

Source boundaries:

- Backend: `backend/src/main/java/com/stayora/reviews/`
- Frontend: `frontend/src/app/reviews/`
- Migration: `backend/src/main/resources/db/migration/V5__reviews_and_ratings.sql`
- Backend tests: `backend/src/test/java/com/stayora/ReviewManagementIntegrationTest.java`
- Frontend tests: the three `*.spec.ts` files in the reviews folder.

The `Review` entity maps to the explicitly qualified `stayora.reviews` table. Its fields are ID, property ID, author ID, reservation ID, integer rating, body, creation time, and update time. References are UUIDs: the module does not import another module's JPA entities or repositories. The migration preserves historical reviews, whose reservation ID can remain null, and adds an index enforcing one review per non-null reservation ID.

## Business rules to explain

1. Only a guest can write a review. The server derives the author and property from the authenticated identity and owned reservation; the request cannot choose either.
2. The reservation must belong to that guest, be `CONFIRMED`, and have reached its check-out date. Pending, declined, cancelled, and future stays cannot be reviewed.
3. A reservation has at most one review. Edit the existing review instead of posting a second one.
4. Ratings are whole numbers from 1 to 5. The trimmed body must contain 10–2,000 characters. Rendering uses Angular text interpolation, not injected HTML.
5. Only the author can edit or delete a review. Hosts can read property reviews but cannot change guest opinions.
6. Review mutations hold the property's pessimistic database lock. The review write and the catalog aggregate update share one transaction. Duplicate concurrent submissions yield one success and one conflict, backed by a unique database index.
7. The average uses `BigDecimal`, two decimal places, and `HALF_UP` rounding. Removing the last actual review produces rating `0.00` and count zero. Actual published reviews determine the aggregate after a mutation; legacy synthetic design values are not evidence of additional reviews.

Cross-module service contracts are `ReservationService.get`, `eligibleForReview`, and `trips`, plus `ListingService.get`, `lock`, and `updateRating`. The listing service owns updates to the property table. Identity comes from `AccountService` and works with actual sessions and the development-only demo identity.

## APIs and screens

| Method | Endpoint                       | Purpose                                                         |
| ------ | ------------------------------ | --------------------------------------------------------------- |
| GET    | `/api/properties/{id}/reviews` | Public review list, average, and count for a published property |
| GET    | `/api/reviews/eligible`        | Current guest's completed unreviewed stays                      |
| GET    | `/api/reviews/mine`            | Current guest's published reviews                               |
| POST   | `/api/reviews`                 | Create `{reservationId, rating, body}`; returns 201             |
| PUT    | `/api/reviews/{id}`            | Edit `{rating, body}`                                           |
| DELETE | `/api/reviews/{id}`            | Delete an owned review; returns 204                             |

Invalid inputs return 400, insufficient permissions return 403, unknown resources return 404, and a duplicate review returns 409. The shared API error envelope supplies an English actionable message.

`/reviews` shows eligible stays and the guest's published reviews. It provides star selection, text validation, edit, and an explicit delete confirmation. `/properties/:propertyId/reviews` shows the public rating snapshot and guest stories, with a link back to the property. Both pages expose loading, empty, and error/retry states. Submission controls disable while saving; radio controls work with keyboard input and carry star labels.

## AI integration presentation

The contributed `ReviewAiSkill` implements the shared `AiSkill` interface. Its identifier is `review-summary`, and its owner is Wassim Hamouda. The property review page sends only `count=N; average=X.XX` to `/api/ai/assist`. It does not send raw review text, guest names, email addresses, or reservation identifiers.

The system prompt tells the model to summarize aggregate accommodation star counts, avoid invented experiences or quotations, acknowledge limited samples, treat context as data, and require human review. The shared provider supports live execution when configured and deterministic mock fallback when unavailable. The UI labels the returned mode and asks the user to check the summary before sharing. The assistant never rewrites the saved review or decides its star rating.

Explain this limitation honestly: the feature summarizes star statistics, not semantic sentiment of the review bodies. It cannot infer cleanliness, noise, or friendliness from an average alone. No key is required for the offline demonstration. Real provider configuration belongs in ignored backend environment files, never Angular code.

## Software-testing presentation

The integration suite uses disposable PostgreSQL under the `test` profile and asserts that the database name is `stayora_test` before destructive fixture cleanup. It covers:

- create/edit/delete with persisted average and count changes;
- lower/upper rating bounds, short/oversized text, and whitespace-only text;
- completed versus future/pending/declined/cancelled eligibility;
- guest ownership and host write rejection;
- duplicate and concurrent duplicate creation;
- decimal averaging and eligible-stay removal after publication;
- deterministic mock AI output and the prompt's non-invention rules.

Frontend tests verify typed HTTP methods and payloads without spoofable author/property fields, whitespace validation, submission locking, and aggregate-only AI input privacy. The English technical report records executed functional checks. The French static-testing report records ESLint analysis of the frontend and does not execute Java or browser tests. Do not claim a tool ran merely because configuration exists.

From the project root run `npm run check`. For only this backend test use `node scripts/backend.mjs -Dspring.profiles.active=test -Dtest=ReviewManagementIntegrationTest test`, with the disposable test PostgreSQL running. Do not point test credentials at Neon.

## Professor demo sequence

1. Select the development guest identity and open `/reviews`.
2. Choose the seeded completed stay, write 10 or more characters, select four or five stars, and save.
3. Open the property's reviews. Show that the review count and average match saved rows.
4. Run the rating summary and point to its mock/live label and the aggregate-only payload.
5. Edit your rating, then reload the public page to show the changed aggregate.
6. Show the integration test that rejects an uncompleted stay and the concurrent duplicate test.
7. Delete the review with confirmation, then show that the stay becomes eligible again.

Only synthetic development data is used in this sequence. Completed demo reservation `20000000-0000-0000-0000-000000000091` belongs to guest `00000000-0000-0000-0000-000000000001`; seeds never overwrite existing records. If the reservation is already reviewed, edit or delete its review before repeating the create step.

## Honest limits and next improvements

Moderation queues, reporting abusive reviews, host public responses, image uploads, pagination, and review email notifications are not implemented. Long-term scale would move average/count aggregation to a repository aggregate query while retaining the same property lock and transaction boundary. Provider-generated output still requires human verification.
