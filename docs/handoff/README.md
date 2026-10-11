# Team handoff and professor demonstration

Stayora has five independent business modules. Shared accounts/authentication/session infrastructure does not count as a member's business module. Each member owns business logic, persistence, UI, meaningful tests, an embedded AI feature and a skill in the shared assistant.

| Member           | Business responsibility                                     | Detailed handoff                           |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------ |
| Aymen Hmani      | Property catalogue, discovery, editing and wishlists        | [Aymen-Hmani.md](Aymen-Hmani.md)           |
| Hadir Ghallabi   | Reservations, trip lifecycle and simulated receipts/refunds | [Hadir-Ghallabi.md](Hadir-Ghallabi.md)     |
| Rania Regai      | Availability blocks, nightly prices and host operations     | [Rania-Regai.md](Rania-Regai.md)           |
| Wassim Hamouda   | Completed-stay reviews and aggregate star ratings           | [Wassim-Hamouda.md](Wassim-Hamouda.md)     |
| Kawther Lahneynè | Guest–host inquiries, conversations and messages            | [Kawther-Lahneyne.md](Kawther-Lahneyne.md) |

Read your handoff for owned tables, endpoints, business rules, source files, tests, AI privacy inputs and honest limitations. Read the root [README](../../README.md) for setup/configuration and [CONTRIBUTING](../../CONTRIBUTING.md) before changing shared contracts.

## Preparation

Start the application with the documented commands. Use local development demo identities for the seeded guest/host and separately demonstrate a registered account session. Confirm the database connection and have a disposable property available for mutation examples. Use future dates that have no existing reservation/block. Completed-stay review examples use the synthetic past reservations, because a new future reservation is not yet eligible for review.

Use the deterministic offline AI configuration if no provider is configured. If demonstrating Groq or local Ollama, verify the response's actual `mode` and `notice` first; a fallback remains a mock response. Keep keys and environment files off the projector. Open the final test command output and French testing report separately; do not claim a result before checking the recorded evidence.

## Fifteen-minute demonstration in English

| Time        | Presenter         | Demonstration and explanation                                                                                                                                                                                                                                                                                                                    |
| ----------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 00:00–01:00 | Team introduction | Identify the five owners. Explain Angular + modular Spring Boot + Neon, shared registered-account sessions, and why accounts are supporting infrastructure. Show that a signed-in account's role takes precedence over demo navigation.                                                                                                          |
| 01:00–04:00 | Aymen             | Create a draft property, request a description suggestion, show nothing is applied until confirmation, then publish. Search destination/capacity/nightly price, open the map/details, save a wishlist and show persisted state. Explain decimal validation and owner-only writes.                                                                |
| 04:00–07:00 | Hadir             | Create a future reservation from the authoritative quote; show the stored trip/receipt. The owning host confirms it; the guest explicitly cancels an eligible future stay and shows the simulated refund/date release. Explain half-open intervals, immutable prices and the shared property lock against double booking. Show itinerary advice. |
| 07:00–09:00 | Rania             | Create and edit an owner availability block, then remove it. Add a nightly price override and show the quote uses it. Show persisted dashboard occupancy and the host-summary skill. Explain why changes cannot overlap active stays and AI does not mutate the calendar.                                                                        |
| 09:00–11:00 | Wassim            | Use the completed synthetic stay without a review. Publish stars/body, edit and remove the review, observing the property's actual average/count. Show aggregate-only review AI input. Explain author ownership, one review per completed confirmed reservation, and limits of summarizing statistics.                                           |
| 11:00–13:00 | Kawther           | Start a property inquiry, exchange guest/host replies, mark messages read, edit your own message and explicitly remove it. Show an AI draft is separate from Send. Explain participant authorization, sender ownership, plain text and no private chat sent to AI.                                                                               |
| 13:00–15:00 | Team conclusion   | Show selected negative/ownership/concurrency test evidence, lint/format/static-analysis outputs and the French report. Open the shared assistant's five owned skills; explain mock/live notices, provider fallbacks and human review. Clearly label simulated payments/locks and other documented limits.                                        |

## Questions every member should be able to answer

1. What real business decision does your module own, and which tables and APIs enforce it?
2. Which identity/ownership check happens on the server, and which negative test proves it?
3. Which cross-module service DTO or ID do you use, and how do you avoid sharing JPA entities?
4. Which test would detect a meaningful regression? What does static analysis establish, and what does it not establish?
5. Which anonymous facts reach your AI skill, what is its prompt boundary, and what requires human confirmation?
6. How do you tell offline fallback from live provider execution, and which integration remains simulated?

The handoffs and application stay in English. The professor's testing deliverable is French. The backend suite passed **51 tests**, the frontend suite passed **33 tests**, and the Sonar workflow passed **6 guard tests**. See the [technical report](../technical-report.md) for functional verification and the concise [French testing report](../testing-report/rapport.pdf) for actual SonarQube screenshots, coverage and open findings. The earlier ESLint-only snapshot remains archived under `docs/static-testing-2026-10-11/`.
