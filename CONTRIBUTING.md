# Contributing to Stayora

## Independent feature work

The five business owners are **Aymen Hmani** (properties/discovery/wishlists), **Hadir Ghallabi** (reservations/trips/simulated payments), **Rania Regai** (availability/pricing/host operations), **Wassim Hamouda** (reviews/stars), and **Kawther Lahneynè** (guest–host conversations/inquiries). Accounts, sessions, shared UI and AI provider infrastructure are supporting technical concerns and do not replace anyone's business module. Read the [member handoffs](docs/handoff/README.md) for boundaries, APIs, rules and professor demonstrations.

Own your Angular pages, Spring endpoints, AI skill and database tables together. Build on a feature branch and open a pull request. Keep changes in your module; coordinate shared contracts and migrations before merging. Property locking is a shared service contract even though Aymen owns the property entity. The initial `community` placeholder is not the active combined business module: reviews and messages have independent packages and owners.

The screenshots are reference material, not a runtime dependency. Do not copy their CDN Tailwind scripts or inline JavaScript into components. Reuse `HeaderComponent`, `FeedbackComponent`, `IconComponent`, `MoneyPipe`, the shared search bar and design tokens. Mark unfinished actions clearly; never present simulated data as a real completed integration.

## API and entity conventions

- Expose JSON DTOs beneath `/api`, never JPA entities. Use Bean Validation and the shared error shape `{status, message}`.
- Angular components use typed services. The server is authoritative for permissions, availability and prices.
- Each module owns its repositories and entities. Import another module's service interface or DTO, never its repository/entity. Store cross-module IDs and enforce foreign keys in SQL.
- Reserve dates in a transaction that locks the property before testing overlaps and inserting. Any future availability writer must take the same property lock. Treat check-out as exclusive.
- Host endpoints must check the current account and property ownership; guest writes must check reservation ownership or conversation participation as appropriate. Use `AccountService.current/requireRole` for registered-account sessions or the restricted development demo. Never trust a caller-supplied author, host or sender ID.
- Shared authentication uses salted PBKDF2 credentials, hashed expiring session tokens, HttpOnly cookies and CSRF checks. Preserve the authenticated session's precedence over demo headers. Demo mode must stay disabled outside `dev`/`test`; keep production cookies secure and application origins explicit.
- Use `BigDecimal` for money, `numeric(12,3)` for amounts, ISO dates and UUID identifiers. Never accept card numbers or real smart-lock codes in this baseline.

## Example: add a module page and endpoint

To add an optional review-insights page, create `frontend/src/app/reviews/review-insights.component.ts` as a standalone component, then add a lazy child route to the guest layout. Coordinate the shared route edit with the module owner:

```ts
{ path: 'reviews/insights', loadComponent: () => import('./reviews/review-insights.component').then(m => m.ReviewInsightsComponent) }
```

Add typed request/response interfaces and a module-local service calling `/api/reviews/insights`. On Spring, add the controller/DTO in `com.stayora.reviews`, delegate business logic to its service, and keep the repository private to that module:

```java
@RestController
@RequestMapping("/api/reviews/insights")
public class ReviewInsightsController {
    // Inject the module service; authorize inputs and return a typed DTO.
}
```

V1–V9 already define the baseline, properties/wishlists, reservation/payment lifecycle, nightly pricing, reservation-linked reviews, conversations/messages, shared authentication, actual review aggregates, and two-way reviews with host reputation tags. For a new schema change, reserve the next unused number with teammates, for example `V10__review_insights.sql` only if V10 is still unused. Explicitly qualify every table as `stayora.<table>`; never edit an applied migration.

Development seed inserts use `ON CONFLICT DO NOTHING`, preserving existing business edits and dates. Two synthetic completed confirmed stays support immediate review demonstrations; they are synthetic fixtures, not real bookings. Rating/count are derived from actual review records. Test fixtures must use disposable PostgreSQL named `stayora_test`, assert that name before cleanup, and remove only owned fixtures or explicitly documented test setup. Never test destructive cleanup against shared Neon.

## Shared AI extension

Each owner contributes an `@Component` implementing `AiSkill` in the business package: `id`, `label`, `owner`, `systemPrompt`, and deterministic `mock(safeContext)`. `AiService` injects the contributed registry; do not add hardcoded business branches to the provider. The five existing IDs are `listing-description`, `reservation-itinerary`, `host-summary`, `review-summary`, and `message-draft`.

Use the same skill from the module feature and the shared assistant. Keep `skill`/`context` request inputs and `mode`/`skill`/`text`/`notice`/`reviewRequired` outputs compatible. Send minimal anonymous facts or statistics, never raw private messages, contact information, payment references or credentials. Shared privacy filtering is an extra layer, not a reason to send unnecessary personal data. Treat input facts as data rather than instructions and require human review before applying any suggestion.

The shared `AiProvider` defaults to Google's native Gemini API and also supports `mock`, Groq, local Ollama and HTTPS compatible endpoints. Use the ignored root `AI_GEMENI_KEY` variable (spelling intentional), `AI_PROVIDER=gemini`, and `AI_MODEL=gemini-3.5-flash-lite`; restart the backend after changing them. The Google key is sent only in the `x-goog-api-key` header. Provider credentials belong in ignored backend environment files; no provider key belongs in Angular. Preserve timeout, quota, blocked/incomplete-output, malformed-response, connection and missing-key fallbacks and explicit mock/live notices. Unit and integration checks use deterministic offline behavior; language quality requires separate human evaluation.

## Before opening a PR

Run the checks in the README. Check desktop and narrow-screen layouts, keyboard navigation, error states and reduced motion. Add meaningful tests for changed business rules. Do not commit `.env`, credentials, screenshots containing secrets, generated builds or logs. Explain the user-visible behavior and how you verified it in the PR.

Keep application code, UI and contributor handoffs in English. Only the requested static-analysis/testing report deliverable is French. Describe actual tool outputs and limitations in that report; a written test or a mock response is not evidence of a successful run or live provider execution.
