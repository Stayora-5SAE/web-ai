# Contributing to Stayora

## Independent feature work

Assign one business module per teammate using the table in the README. Own its Angular pages, Spring endpoints and database tables together. Build on a feature branch and open a pull request. Keep feature changes in your module; coordinate changes to shared contracts and migrations before merging.

The screenshots are reference material, not a runtime dependency. Do not copy their CDN Tailwind scripts or inline JavaScript into components. Reuse `HeaderComponent`, `FeedbackComponent`, `IconComponent`, `MoneyPipe`, the shared search bar and design tokens. Mark unfinished actions clearly; never present simulated data as a real completed integration.

## API and entity conventions

- Expose JSON DTOs beneath `/api`, never JPA entities. Use Bean Validation and the shared error shape `{status, message}`.
- Angular components use typed services. The server is authoritative for permissions, availability and prices.
- Each module owns its repositories and entities. Import another module's service interface or DTO, never its repository/entity. Store cross-module IDs and enforce foreign keys in SQL.
- Reserve dates in a transaction that locks the property before testing overlaps and inserting. Any future availability writer must take the same property lock. Treat check-out as exclusive.
- Host endpoints must check the current account and property ownership. Replace the entire demo identity mechanism with real authentication rather than exposing it in production.
- Use `BigDecimal` for money, `numeric(12,3)` for amounts, ISO dates and UUID identifiers. Never accept card numbers or real smart-lock codes in this baseline.

## Example: add a module page and endpoint

Add `frontend/src/app/community/reviews.component.ts` as a standalone component, then add a lazy child route to the guest layout:

```ts
{ path: 'reviews', loadComponent: () => import('./community/reviews.component').then(m => m.ReviewsComponent) }
```

Add typed request/response interfaces and a `community` service calling `/api/reviews`. On Spring, add a controller and DTO in `com.stayora.community`, delegate business logic to its service, and keep its repository private to the module:

```java
@RestController
@RequestMapping("/api/reviews")
public class ReviewController {
    // Inject ReviewService; validate inputs and return ReviewView DTOs.
}
```

For schema changes create a new migration such as `V2__review_timestamps.sql`. Explicitly qualify every table as `stayora.<table>`. Agree on the next migration number with teammates; do not edit an applied migration. Existing seed data uses `ON CONFLICT DO NOTHING`, so seed changes do not modify existing rows automatically.

## Shared AI extension

Add one named skill in `AiService`, keeping the mock response deterministic, and test it without an external provider. A future real implementation must preserve `skill`/`context` inputs and `mode`/`skill`/`text` outputs. Do not send raw account, guest or message data to external models. Add configurable timeouts, quota handling and missing-key fallback before exposing provider output.

## Before opening a PR

Run the checks in the README. Check desktop and narrow-screen layouts, keyboard navigation, error states and reduced motion. Add meaningful tests for changed business rules. Do not commit `.env`, credentials, screenshots containing secrets, generated builds or logs. Explain the user-visible behavior and how you verified it in the PR.
