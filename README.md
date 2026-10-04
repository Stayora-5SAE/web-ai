# Stayora

An Angular + Spring Boot travel-booking baseline for a five-person team. The eight UI references live in `design/`. Listings, pricing, reservations and host decisions use PostgreSQL; payment, smart-lock and AI interactions are explicitly simulated.

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

## Versions and architecture

Angular framework **18.2.14**, CLI/build **18.2.21**, TypeScript **5.5.4**, RxJS **7.8.2**, Tailwind **3.4.19**, Spring Boot **3.3.6**, Java **17**, PostgreSQL JDBC **42.7.13**. These Angular/Spring versions match the local Tfakkarni project. Lockfiles are committed. Keep version changes deliberate; this requested legacy toolchain has transitive dependency audit findings and should be reviewed before production use.

One Spring application, one PostgreSQL schema, five business modules. The browser talks only to `/api`; database secrets stay on the backend. No Keycloak, discovery server, gateway, or external AI provider is required.

| Contributor module          | Angular folder | Spring package | Owned tables          |
| --------------------------- | -------------- | -------------- | --------------------- |
| Accounts                    | `accounts`     | `accounts`     | `accounts`            |
| Listings/search             | `listings`     | `listings`     | `properties`          |
| Reservations/payments       | `reservations` | `reservations` | `reservations`        |
| Availability/host dashboard | `availability` | `availability` | `availability_blocks` |
| Reviews/messages            | `community`    | `community`    | `reviews`, `messages` |

Shared code is limited to UI components, API/error conventions, configuration, and the mock AI service. Read [CONTRIBUTING.md](CONTRIBUTING.md) before adding a feature.

## Demo identities and flow

The guest layout uses **Sami Ben Ali**, and the host layout uses **Nadia**. Navigation switches the development-only `X-Demo-Identity` header. This is not authentication. The backend refuses startup unless demo mode is enabled with only `dev`/`test` profiles; implement real authentication before deployment.

1. Explore and search with destination, dates, guest count and property category.
2. Open a stay, check its authoritative quote, and reserve.
3. Agree to the demo rules and confirm the simulated payment. The request is saved as `PENDING`.
4. Switch to host mode and accept or decline. Accepting confirms the request; declining releases its dates.

All prices are TND with three decimal places. Quote inputs contain only property ID, dates and guest count. The backend ignores client prices and recomputes totals. Stays use `[check-in, check-out)` intervals; adjacent stays are allowed. Pending and confirmed requests block dates; declined requests do not. Pending expiry is intentionally deferred, so the host must decide requests to release holds.

Draft listings cannot be booked. Full editing, authentication, wishlists, conversations, reviews, payment providers and physical locks are contributor extensions. Their existing UI controls are labeled as unavailable or demo-only.

## Database configuration

Set `DB_URL` to a **JDBC** pooled Neon URL and `DB_MIGRATION_URL` to its direct endpoint, with separate `DB_USERNAME` and `DB_PASSWORD`. Use `sslmode=require&channelBinding=require` (JDBC uses camelCase, unlike libpq's `channel_binding`). The direct Neon hostname omits `-pooler`.

Flyway creates and migrates only `stayora`; Hibernate validates rather than edits the schema. Entity mappings and queries explicitly name the schema so transaction pooling does not depend on session `search_path`. Existing `neon_auth` objects are outside the app's migrations.

The `dev` profile seeds synthetic profiles, eight properties, two reservations and one owner block using stable IDs and `ON CONFLICT DO NOTHING`. Seeding never overwrites edits. Sample reservations begin next month at first startup; existing dates stay unchanged on later runs. Shared Neon data is shared across contributors—use separate Neon branches or local databases when experimenting. Never drop the shared schema to reset a demo.

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

## Mock AI

Use the **Demo AI** panel or `POST /api/ai/assist` with `{ "skill": "listing-description", "context": "La Marsa" }` or skill `host-summary`. Responses carry `mode: "mock"` and are deterministic. No network calls or API key are used. Extend the skill registry in `AiService`; before adding a real provider, mask personal data, validate outputs, and handle timeout/quota/missing-key errors.
