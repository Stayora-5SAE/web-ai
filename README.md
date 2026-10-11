# Stayora

An Angular + Spring Boot accommodation project with five member-owned business modules. The eight original UI references live in `design/`; the implemented flows add property editing, wishlists, trips, calendar management, reviews, conversations and registered-account sessions. PostgreSQL persists business data. Payments and physical locks remain explicitly simulated; AI supports a deterministic offline mode and optional configured providers.

## Start locally

Requirements: **Node 22**, npm, **Java 17** (set `JAVA_HOME`), internet access for Maven's first run, and a Neon/PostgreSQL connection. Maven Wrapper is included; no global Maven installation is needed.

```sh
npm ci
cp backend/.env.example backend/.env
# Fill the four DB variables in backend/.env; never commit it.
npm run setup
npm run dev
```

PowerShell: use `Copy-Item backend/.env.example backend/.env` instead of `cp`. Do not overwrite an already configured `.env`.

- App: http://localhost:4200
- Backend health: http://127.0.0.1:8081/actuator/health
- API documentation: http://127.0.0.1:8081/api/docs
- OpenAPI JSON: http://127.0.0.1:8081/v3/api-docs

The root launcher loads `backend/.env` into the backend process. Spring does **not** automatically read `.env` when launched from an IDE: configure the same environment variables there. `npm run dev:backend` and `npm run dev:frontend` start each part separately. Both listen on loopback by default. To change the backend port, set `PORT` and update `frontend/proxy.conf.json` together.

## SonarQube and testing report

SonarQube runs locally from its native Windows ZIP, with its own Java runtime and evaluation database. Setup and commands are in [quality/README.md](quality/README.md): `npm run sonar:start`, `npm run sonar:coverage`, `npm run sonar:scan`, `npm run sonar:export`, and `npm run sonar:test`. CI generates coverage artifacts and runs the workflow guard tests.

The concise [French professor report](docs/testing-report/rapport.pdf) contains measured results and actual SonarQube screenshots. Its [evidence](docs/testing-report/evidence/verification.json) records the analyzed local snapshot. The earlier ESLint-only report remains archived under `docs/static-testing-2026-10-11/`.

## Versions and architecture

Angular framework **18.2.14**, CLI/build **18.2.21**, TypeScript **5.5.4**, RxJS **7.8.2**, Tailwind **3.4.19**, Spring Boot **3.3.6**, Java **17**, PostgreSQL JDBC **42.7.13**. These Angular/Spring versions match the local Tfakkarni project. Lockfiles are committed. Keep version changes deliberate; this requested legacy toolchain has transitive dependency audit findings and should be reviewed before production use.

One Spring application, one PostgreSQL schema, five business modules. The browser talks only to `/api`; database secrets and provider keys stay on the backend. No Keycloak, discovery server, gateway, or external AI provider is required for the offline demonstration.

| Member           | Business module                            | Angular folder / Spring package | Owned tables                            |
| ---------------- | ------------------------------------------ | ------------------------------- | --------------------------------------- |
| Aymen Hmani      | Properties, discovery and wishlists        | `listings`                      | `properties`, `wishlist_entries`        |
| Hadir Ghallabi   | Reservations, trips and simulated payments | `reservations`                  | `reservations`, `reservation_payments`  |
| Rania Regai      | Availability, pricing and host operations  | `availability`                  | `availability_blocks`, `nightly_prices` |
| Wassim Hamouda   | Reviews and star ratings                   | `reviews`                       | `reviews`                               |
| Kawther Lahneynè | Guest–host conversations and inquiries     | `messages`                      | `conversations`, `messages`             |

Accounts are shared authentication infrastructure and **do not count as a member's business module**. The shared `accounts` package owns profiles, password credentials and sessions. Shared code also supplies UI components, HTTP/error conventions, configuration, and the AI skill/provider interfaces. Business modules reference one another through IDs and service DTOs rather than shared JPA entity relationships. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [member handoffs](docs/handoff/README.md) before adding a feature.

## Authentication, demo identities and working flows

`/register` and `/login` support real guest/host accounts with salted PBKDF2 password hashes and 24-hour cookie sessions. Session tokens are hashed in PostgreSQL; cookies are HttpOnly and SameSite Strict, and session mutations use CSRF protection. An authenticated account takes precedence over a demo header; switching layouts cannot change its role or ownership.

For an immediate local demonstration, the guest layout uses **Sami Ben Ali** and the host layout uses **Nadia** through the development-only `X-Demo-Identity` header. Seed profiles have no published passwords. Set `DEMO_ENABLED=false` to use registered accounts only. Demo mode is forbidden outside `dev`/`test`; non-development cookies default to secure and require HTTPS. Configure `APP_ORIGINS` for the intended application origin. Deployment is outside this local academic project.

1. **Aymen:** create/edit a property at `/host/listings`, publish or safely archive it; search by destination, dates, capacity, category and nightly price; save guest wishlists at `/wishlists`.
2. **Hadir:** review an authoritative quote, agree to the simulation and create a `PENDING` reservation. Inspect persisted trips/receipts at `/trips`; the owning host accepts or declines at `/host/reservations`. Guests can cancel eligible future stays, releasing dates and recording a simulated refund.
3. **Rania:** create/edit/remove owner blocks and nightly-price overrides at `/host/calendar`. `/host/today` computes occupancy, pending requests and simulated payout from persisted data.
4. **Wassim:** submit/edit/delete a review for an owned completed confirmed stay at `/reviews`. Property review pages display actual reviews and the recalculated average/count.
5. **Kawther:** start a pre-booking inquiry from a property or a reservation conversation. Guest/host inboxes support replies, read state and sender-owned message editing/removal.

All prices are TND with three decimal places. Quote inputs contain only property ID, dates and guest count. The backend ignores client prices and recomputes totals, including nightly overrides. Reservations keep immutable agreed price snapshots. Stays use `[check-in, check-out)` intervals; adjacent stays are allowed. Pending and confirmed requests block dates; declined and cancelled requests do not. Pending expiry is deferred, so a host decision or permitted guest cancellation releases those holds.

Draft and archived properties cannot be booked. Archival preserves history and is rejected while future active stays exist. Reviews require a completed confirmed stay and are limited to one per reservation. Message reads and writes enforce conversation participation; only senders edit/remove their own messages. Real card charging, physical smart-lock integration, image uploads and push notifications remain outside the implemented flows. No real card details are collected.

## Database configuration

Set `DB_URL` to a **JDBC** pooled Neon URL and `DB_MIGRATION_URL` to its direct endpoint, with separate `DB_USERNAME` and `DB_PASSWORD`. Use `sslmode=require&channelBinding=require` (JDBC uses camelCase, unlike libpq's `channel_binding`). The direct Neon hostname omits `-pooler`.

Flyway creates and migrates only `stayora`; Hibernate validates rather than edits the schema. Entity mappings and queries explicitly name the schema so transaction pooling does not depend on session `search_path`. Existing `neon_auth` objects are outside the app's migrations.

Applied schema changes are versioned as follows:

| Migration | Responsibility                                                                  |
| --------- | ------------------------------------------------------------------------------- |
| V1        | Baseline profiles, properties, reservations, blocks, reviews and messages       |
| V2        | Property archive/validation constraints and guest wishlist entries              |
| V3        | Cancellation state and simulated payment ledger                                 |
| V4        | Date-specific nightly prices                                                    |
| V5        | Reservation-linked reviews, timestamps and uniqueness                           |
| V6        | Inquiry/reservation conversations, participant read state and message lifecycle |
| V7        | Shared password credentials and session storage                                 |
| V8        | Derive property rating/count from actual review records                         |

The `dev` profile uses stable IDs and `ON CONFLICT DO NOTHING` for synthetic profiles, eight properties, two future sample reservations, one owner block and two completed confirmed stays. One completed stay already has a review; the other lets the guest demonstrate eligibility immediately. Seeded reservations have simulated payment receipts. Future sample dates start next month at first startup; completed stays use earlier dates at first insertion. Existing records and dates are preserved on repeat startup. Rating/count are derived values recalculated from actual reviews, replacing illustrative design numbers.

Shared Neon data is shared across contributors—use separate Neon branches or local databases when experimenting. Never drop the shared schema to reset a demo, and never rewrite an already applied migration.

## Checks

Chrome/Chromium is required for frontend tests. Set `CHROME_BIN` if it is not auto-detected.

```sh
docker compose -f compose.test.yml up -d --wait
npm run check
docker compose -f compose.test.yml down
```

Integration tests use **only** `TEST_DB_URL`, `TEST_DB_USERNAME`, and `TEST_DB_PASSWORD`, defaulting to local port 5433 and database `stayora_test`. They do not inherit the Neon application credentials. Their cleanup additionally verifies the database name before deleting test rows. CI provisions its own PostgreSQL service. For a manually provisioned test database, set these three variables and retain the name `stayora_test`.

`npm run format` applies Prettier and Spotless; `npm run format:check` checks them. Run `npm ci` at the root and `npm run setup` after a fresh clone. CI separately checks frontend lint/tests/build and backend tests/package/formatting.

## Design and maps

The supplied screenshots/HTML define the visual direction; common colors and layout rules are in `frontend/src/styles.css` and the compiled Tailwind config. The screens preserve serif headings, teal actions, mint discovery surfaces and warm host/checkout surfaces. They adapt to mobile and respect reduced motion.

`frontend/public/config.json` controls map tiles and attribution. Default tiles are OpenStreetMap, with visible attribution, normal browser caching, and no bulk prefetching. Choose a suitable provider before scaling beyond development. If tiles fail, the search list remains usable. Photography URLs are retained from the supplied references and require network access; fonts have local fallbacks.

## Shared assistant and business AI features

Each member contributes one `AiSkill` implementation to the shared assistant registry and a feature embedded in the corresponding business screen:

| Member           | Skill                   | Embedded behavior                                                       |
| ---------------- | ----------------------- | ----------------------------------------------------------------------- |
| Aymen Hmani      | `listing-description`   | Draft a property description for explicit host review/application       |
| Hadir Ghallabi   | `reservation-itinerary` | Suggest a trip itinerary from public destination/date facts             |
| Rania Regai      | `host-summary`          | Explain aggregate occupancy and suggest calendar actions                |
| Wassim Hamouda   | `review-summary`        | Summarize star statistics and acknowledge sample limits                 |
| Kawther Lahneynè | `message-draft`         | Draft an arrival, checkout or property question; sending stays explicit |

`GET /api/ai/skills` lists IDs, labels and owners. `POST /api/ai/assist` accepts `{ "skill": "listing-description", "context": "La Marsa, apartment, kitchen" }`. Responses include `mode` (`mock` or `live`), `skill`, `text`, `notice` and `reviewRequired`. AI does not execute a booking, publish a listing, change prices, assign stars or send a message.

Default `AI_PROVIDER=mock` is deterministic and requires no key or external request. Optional providers use server-only variables in ignored `backend/.env`:

- **Groq:** `AI_PROVIDER=groq`, `AI_BASE_URL=https://api.groq.com/openai/v1`, `AI_API_KEY=<your key>`, and a supported `AI_MODEL`.
- **Local Ollama:** `AI_PROVIDER=ollama`, `AI_BASE_URL=http://127.0.0.1:11434/v1`, and `AI_MODEL=<an installed local model>`; a key is not required.
- **OpenAI-compatible server:** `AI_PROVIDER=openai-compatible`, its HTTPS `AI_BASE_URL`, key and model.

`AI_TIMEOUT_SECONDS` defaults to 12 and is capped at 30. Missing keys, provider failure/quota, timeout, malformed or rejected output fall back to the module's labeled offline response. Shared privacy handling reconstructs outbound context from anonymous allowed public facts; raw private chat, contact information and credentials are not forwarded. Provider output is bounded and validated, and every response requires human review. Configure a real provider only to demonstrate live integration; the complete business flow works without one.
