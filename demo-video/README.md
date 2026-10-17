# Stayora product demo

A 2:37 walkthrough organized into visitor and host journeys of the actual Stayora application. Edited in Remotion at 1920×1080, 30 fps, with large feature titles and an original instrumental score. Small captions, subtitles and footnotes are omitted. Login and account management are excluded. AI demonstrations display an `Ai` pill at the bottom left, 300 px wide (75% of the left rail) and horizontally centered, including the mobile assistant view.

The `StayoraDemo` composition and each independently editable `FeatureScene`, `TitleScene` and `ChapterScene` are registered in `src/Composition.tsx`. Edit the authored timeline in `src/Demo.tsx`.

## Preview and export

Use Node 22.13+ (or another version allowed by `package.json`). From this directory:

```sh
npm ci
npm run dev
# Recreate the original score if needed:
node scripts/score.mjs
# Render scene checks, then the complete H.264 video:
node scripts/render.mjs --render
```

`REMOTION_BROWSER_EXECUTABLE` can select an existing Chrome Headless Shell executable. This recording used the centrally installed browser under `C:/custom/bins/ms-playwright/`. The script writes to `../output/playwright/demo-2026-10-16/`.

The editable ZIP includes all 17 source captures, selected clips and the score. Git ignores those binary assets; keep the archive or restore its `public/` files before rendering a fresh checkout.

## Chapters

| Start | Journey / feature |
| --- | --- |
| 0:00 | Opening |
| 0:02 | Chapter 1 - Visitors |
| 0:06 | Visitors - Discover and save |
| 0:18 | Visitors - Book and view receipt |
| 0:31 | Visitors - AI itinerary after booking |
| 0:40 | Visitors - Shared AI assistant |
| 0:47 | Visitors - Contact your host |
| 0:55 | Visitors - AI message suggestion |
| 1:02 | Visitors - Review your stay |
| 1:07 | Visitors - AI rating snapshot |
| 1:14 | Visitors - Cancellation and refund |
| 1:20 | Visitors - Mobile |
| 1:23 | Chapter 2 - Hosts |
| 1:27 | Hosts - Create and manage listings |
| 1:38 | Hosts - AI listing draft |
| 1:47 | Hosts - Confirm a request |
| 1:54 | Hosts - Calendar and nightly prices |
| 2:05 | Hosts - Performance dashboard |
| 2:10 | Hosts - AI performance insights |
| 2:19 | Hosts - Review your visitors |
| 2:24 | Hosts - Reputation and counted tags |
| 2:30 | Hosts - Mobile workspace |
| 2:34 | Closing |
| 2:37 | End |

## Recording evidence

All six AI demonstrations returned actual live model responses through the application's OpenRouter configuration. Each reported `cohere/north-mini-code:free`; the configured free-model fallback chain was retained. Provider wait times were shortened in the edit. Generated advice remains advisory and should be checked by the user. No mocked AI response was inserted.

The footage was recorded through Playwright against an isolated, seeded local database (`stayora_demo_video` on PostgreSQL port 55433), backend 8082 and frontend 4201. Demo mutations did not touch the configured Neon database. Accounts, participants, listings, reservations and messages shown are fictional. Payments and refunds are the application's simulated flow. The review recording also verified that host-written visitor reviews have no tag picker.

Desktop footage is 1280×800; the phone capture is 390×844. The edit retimes clips to fit the chapter lengths. The review recording is split into guest, host and reputation clips; phone footage is split between the two journeys. These selections exclude navigation waits. `storyboard.json` documents the authored JSX timeline and drives the QA frame selection. Core features appear before their related AI integrations. Full-screen chapter cards mark Visitors at 0:02 and Hosts at 1:23. Music was synthesized locally by `scripts/score.mjs`; no third-party audio or narration is used. No environment files or provider keys belong in this project or archive.

## Validation

`npm run lint` checks TypeScript and ESLint. The export script renders representative frames from every chapter before exporting. The delivery folder contains the media probe report, timeline metadata and scene contact sheet alongside the MP4.
