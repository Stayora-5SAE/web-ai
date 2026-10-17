# Team handoff and professor demonstration

Stayora has five independent business modules. Shared accounts/authentication/session infrastructure does not count as a member's business module. Each member owns business logic, persistence, UI, meaningful tests, an embedded AI feature and a skill in the shared assistant.

| Member           | Business responsibility                                     | Detailed handoff                           |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------ |
| Aymen Hmani      | Property catalogue, discovery, editing and wishlists        | [Aymen-Hmani.md](Aymen-Hmani.md)           |
| Hadir Ghallabi   | Reservations, trip lifecycle and simulated receipts/refunds | [Hadir-Ghallabi.md](Hadir-Ghallabi.md)     |
| Rania Regai      | Availability blocks, nightly prices and host operations     | [Rania-Regai.md](Rania-Regai.md)           |
| Wassim Hamouda   | Two-way stay/visitor reviews, host tags and reputation      | [Wassim-Hamouda.md](Wassim-Hamouda.md)     |
| Kawther Lahneynè | Guest–host inquiries, conversations and messages            | [Kawther-Lahneyne.md](Kawther-Lahneyne.md) |

Read your handoff for owned tables, endpoints, business rules, source files, tests, AI privacy inputs and honest limitations. Read the root [README](../../README.md) for setup/configuration and [CONTRIBUTING](../../CONTRIBUTING.md) before changing shared contracts.

## Preparation

Start the application with the documented commands. Use local development demo identities for the seeded guest/host and separately demonstrate a registered account session. Confirm the database connection and have a disposable property available for mutation examples. Use future dates that have no existing reservation/block. Completed-stay review examples use the synthetic past reservations, because a new future reservation is not yet eligible for review.

Use the deterministic offline AI configuration if no provider is configured. If demonstrating OpenRouter, Groq or local Ollama, verify the response's actual `mode` and `notice` first; a fallback remains a mock response. Keep keys and environment files off the projector. Open the final test command output and French testing report separately; do not claim a result before checking the recorded evidence.

## Fifteen-minute demonstration in English

| Time        | Presenter         | Demonstration and explanation                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 00:00–01:00 | Team introduction | Identify the five owners. Explain Angular + modular Spring Boot + Neon, shared registered-account sessions, and why accounts are supporting infrastructure. Show that a signed-in account's role takes precedence over demo navigation.                                                                                                                                                                                                                  |
| 01:00–04:00 | Aymen             | Create a draft property, request a description suggestion, show nothing is applied until confirmation, then publish. Search destination/capacity/nightly price, open the map/details, save a wishlist and show persisted state. Explain decimal validation and owner-only writes.                                                                                                                                                                        |
| 04:00–07:00 | Hadir             | Create a future reservation from the authoritative quote; show the stored trip/receipt. The owning host confirms it; the guest explicitly cancels an eligible future stay and shows the simulated refund/date release. Explain half-open intervals, immutable prices and the shared property lock against double booking. Show itinerary advice.                                                                                                         |
| 07:00–09:00 | Rania             | Create and edit an owner availability block, then remove it. Add a nightly price override and show the quote uses it. Show persisted dashboard occupancy and the host-summary skill. Explain why changes cannot overlap active stays and AI does not mutate the calendar.                                                                                                                                                                                |
| 09:00–11:00 | Wassim            | Use the completed synthetic stay without a review. Publish stars/body and host tags, then show counted pills on host Today/Reviews. Review the visitor from host mode; show the received review in the guest hub. Edit/remove feedback and observe separate property/visitor ratings. Show aggregate-only review AI input. Explain author ownership, one review per direction per completed confirmed reservation, and limits of summarizing statistics. |
| 11:00–13:00 | Kawther           | Start a property inquiry, exchange guest/host replies, mark messages read, edit your own message and explicitly remove it. Show an AI draft is separate from Send. Explain participant authorization, sender ownership, plain text and no private chat sent to AI.                                                                                                                                                                                       |
| 13:00–15:00 | Team conclusion   | Show selected negative/ownership/concurrency test evidence, lint/format/static-analysis outputs and the French report. Open the shared assistant's five owned skills; explain mock/live notices, provider fallbacks and human review. Clearly label simulated payments/locks and other documented limits.                                                                                                                                                |

## Questions every member should be able to answer

1. What real business decision does your module own, and which tables and APIs enforce it?
2. Which identity/ownership check happens on the server, and which negative test proves it?
3. Which cross-module service DTO or ID do you use, and how do you avoid sharing JPA entities?
4. Which test would detect a meaningful regression? What does static analysis establish, and what does it not establish?
5. Which anonymous facts reach your AI skill, what is its prompt boundary, and what requires human confirmation?
6. How do you tell offline fallback from live provider execution, and which integration remains simulated?

The handoffs and application stay in English. The professor's testing deliverable is French. The backend suite passed **51 tests**, the frontend suite passed **33 tests**, and the Sonar workflow passed **6 guard tests**. See the [technical report](../technical-report.md) for functional verification and the concise [French testing report](../testing-report/rapport.pdf) for actual SonarQube screenshots, coverage and open findings. The earlier ESLint-only snapshot remains archived under `docs/static-testing-2026-10-11/`.

## Review integration update (15 October 2026)

V9 adds independent stay and visitor reviews plus explicit positive/negative host tags. Read Wassim's API and migration contract, Aymen's property-detail integration, Hadir's completed-stay links/guest reputation, and Rania's all-time host reputation highlight. Host-written visitor feedback has stars/body only. Existing Sonar/French report counts above are historical evidence, not a fresh analysis of this update.

Verification for this update: backend `verify` passed **54 tests** (including 11 review integration tests) against local PostgreSQL `stayora_test`; frontend passed **35 tests**, lint and production build. Spotless and Prettier checks passed. Browser checks used the real API against the disposable local database: guest/host publication, received visitor feedback, host `Clean ×2` and negative pills, embedded property reviews, reservation reputation, and narrow-screen/landscape layouts. Sonar analysis was not rerun for this update; retain the historical reports as dated evidence.

## Shared OpenRouter connection (16 October 2026)

All five module AI tools and the shared assistant now use OpenRouter by default. Replace `OPENROUTER_API_KEY` in the ignored root `.env` and restart the backend. `AI_MODEL=google/gemma-4-26b-a4b-it:free` is configurable. Keep all provider keys server-side; never paste them into an Angular component or a handoff. Each embedded tool displays the actual provider/fallback notice, and a placeholder never causes an external request. Read [AI configuration](../ai-prompts.md#backend-only-configuration-examples) for setup and alternative providers. Deterministic mock behavior remains explicit in tests and as a labeled fallback; it is not evidence of live model execution.

OpenRouter update verification: the full backend suite passed **57 tests**, and the frontend passed **35 tests**, lint and production build. Provider tests cover all five prompts, the OpenRouter URL/authentication/model payload, missing/placeholder keys, invalid credentials, credits, empty output and error envelopes without external requests. The final provider wording changes were checked with the focused AI suite. Formatting checks passed. Live-key verification was subsequently attempted on 16 October 2026: the key authenticated successfully, but the selected Gemma free endpoint returned upstream rate-limit errors. See the live-run evidence below.

## Live model verification (16 October 2026)

Model: `google/gemma-4-26b-a4b-it:free`. The configured OpenRouter key authenticated successfully. All five embedded AI tools plus the shared assistant were exercised through the actual browser UI. Each returned HTTP 200 from Stayora with `mode: mock`, because Google AI Studio's free endpoint returned HTTP 429 upstream (temporarily rate-limited). **0 of 6 UI runs produced a live model response.** These results verify the fallback display, not live generation quality or latency.

No generated listing draft was applied and no message was sent. Six feature screenshots, a sanitized provider diagnostic and per-feature response results are saved locally under `output/playwright/ai-live-2026-10-16/`, with a ZIP at `output/playwright/ai-live-2026-10-16.zip`. Retry after upstream capacity recovers or explicitly select another model before claiming live execution. Provider credentials are absent from the evidence.

## Ordered free-model failover

Shared AI now requests Gemma 26B → Gemma 31B → Cohere North Mini Code through OpenRouter's ordered model fallback routing. `AI_MODEL` selects the primary; `AI_FALLBACK_MODELS` sets the two backups. A backup's validated answer remains live and the API `model` field reports which model answered. If the whole chain is rate-limited, the app shows an explicit offline notice. The request uses one shared timeout budget; no paid model is inserted. This applies to all five embedded tools and the shared assistant. Live retest evidence is recorded separately, with screenshots only for successful live responses.

Failover retest: **59 backend tests** and **35 frontend tests** passed, along with lint, production build and formatting. The real UI returned **6/6 live responses**, all reporting `cohere/north-mini-code:free`, confirming fallback selection. Observed click-to-capture times ranged from about 1.2 to 7.6 seconds. Successful screenshots and the per-feature response/model evidence are in `output/playwright/ai-failover-2026-10-16/` and its ZIP. No screenshot was captured for quota failures.

This confirms routing and generation, rather than factual correctness or polished draft quality. The shared assistant echoed input in one run, the guest message draft used a host-like tone, and itinerary transport suggestions require verification. Drafts were not applied or sent. These remain advisory outputs requiring review.

## AI response formatting (16 October 2026)

All five embedded AI tools and the shared assistant now use `shared/ai-markdown.component.ts` and its scoped stylesheet. Markdown emphasis, headings, nested lists, quotes, links, code and tables render consistently. Raw HTML is escaped, remote images render as labels, and Angular HTML sanitization remains enabled. See [response formatting](../ai-prompts.md#ai-response-formatting). Verification: **39 frontend tests**, lint and production build passed. Browser fixture checks confirmed bold styling, headings, nested lists and tables on desktop and 390 px mobile with no horizontal page overflow in the message draft and shared assistant. These formatting checks used local fixtures and consumed no model quota.

## Responsive layout verification (16 October 2026)

Fixed 320 px overflow in search dates, booking fields and host listing filters. Date fields stack on very narrow phones, grid children and long text can shrink/wrap, card actions wrap, and all five review stars fit their editor. Phone headers keep account/mode actions aligned and navigation scrolls inside its own row. Mobile/touch controls have larger targets; form fields use 16 px type on phones, tablets and short landscape screens. The phone assistant is an accessible 48 px icon button, with safe-area spacing and a panel constrained to the available width and dynamic viewport height.

Chromium verification passed **147 layout checks**: 21 guest/host routes at 320, 390, 540, 768, 820, 1024 and 1440 px, with no horizontal page overflow, API failures or runtime errors. **28 interaction/layout checks** covered navigation, booking fields, review editing/stars, host filters, calendar navigation and assistant bounds at 320×740, 390×844, 768×1024 and 844×390. Six local authenticated-header fixtures with a long name also passed overlap/overflow checks. Existing long values in single-line listing inputs scroll internally as intended. No review, listing or message was submitted and no AI quota was used. **39 frontend tests**, lint, production build and formatting passed. Screenshots and the verification report are in `output/playwright/responsive-2026-10-16/`.

## Populated Neon demo database (16 October 2026)

The expanded [development seed](../seed-data.md) was applied to the configured Neon application database. It now contains **20 accounts, 29 properties (26 published), 75 reservations/payment receipts, 88 reviews (52 stay reviews and 36 guest reviews), 14 conversations and 26 messages**. Existing content was preserved; only unchanged original demo image sets and derived rating caches were refreshed. Custom photos remain intact. The seed was reapplied without changing counts or existing data. Every receipt is simulated, every seeded review has valid stay ownership, and guest reviews have no tags.

The full backend suite passed **60 tests**, followed by a passing seed-specific check after tightening exact-match preservation of custom legacy photos. The seed joins the Spring startup transaction and an integration test verifies repeatability, edited content/date preservation, review direction, totals and booking overlap. All 16 Pexels source images responded successfully. The browser loaded all 26 catalog cover images and checked nine populated screens at desktop/phone widths (18 layout checks), with no overflow or runtime errors. Nadia's view shows 24 host reviews, `Clean ×17`, good/bad tags, 10 active listings and three pending requests; Sami has seven received guest reviews and one stay still eligible to review. Screenshots and sanitized results are in `output/playwright/seed-2026-10-16/`. No AI quota was used.

The larger review counts also exposed a small rating-bar layout issue: star labels and multi-digit counts wrapped. Labels now retain their width and the track flexes between them. The frontend passed **39 tests**, lint and production build after that correction; final desktop/mobile screenshots wait for the reputation highlight to finish loading.

## Recorded product demo (16 October 2026)

The **2:37** Remotion walkthrough follows two natural product journeys. Full-screen **Visitors** (0:02) and **Hosts** (1:23) chapter cards separate them. Each core feature appears before its related AI integration, covering discovery/wishlists, bookings/refunds, trip planning, conversations, reviews, listing management, host requests, availability/prices, performance and mobile. See [the editable video project and chapter list](../../demo-video/README.md). The MP4 and editable archive are in `output/playwright/demo-2026-10-16/`.

The six AI captures returned live responses and reported `cohere/north-mini-code:free`. Provider waits are shortened in the edit; generated travel advice still requires verification. All mutation footage used an isolated seeded local database, preserving Neon. Payments/refunds are simulated, and the footage contains fictional participants. The demo uses large feature titles and an original instrumental score; small captions/subtitles remain removed. The revised cut adds a read-only host dashboard recording to establish performance context before the AI summary.

The edit omits login/account management. A 300 px wide `Ai` pill, horizontally centered in the bottom of the 400 px left rail, marks the six AI demonstrations and the mobile assistant view.
