# TripWeaver — Project Status

Last updated: 2026-07-31. This file is meant to give a fresh chat session (or a
different person) full context without re-reading the whole history. Read this
first before touching code.

## What this is

TripWeaver is a family travel-planning web app: search flights + hotels,
compare complete trip options, tune an optimizer to re-rank them, and get an
AI ("Trip Optimizer agent") review of the results. Originally built as a
90-minute hackathon prototype on 100% mock data, then partially "unmocked"
against real provider APIs. Next.js App Router + TypeScript + Tailwind.

```bash
npm install
npm run dev
```

No API keys are required to run it — every category has a working demo
fallback (see below), so the app is always demoable.

## Architecture (read this before changing provider or data-model code)

There are **two parallel data models** and an adapter between them:

- `lib/trip/types.ts` — thin shape the real provider APIs return
  (`TransportOffer`, `AccommodationOffer`, simple `TripOption`).
- `lib/types.ts` — the rich shape the UI was originally built against
  (per-traveler pricing, timelines, cost breakdowns, room allocation,
  score explanations, savings opportunities).
- `lib/adapters/criteria.ts` + `lib/adapters/results.ts` — translate rich UI
  criteria into the real API shape, and translate real API results back into
  the rich UI shape. Fields the real APIs can't supply (timelines, per-
  traveler splits, carbon estimates) are **derived, not fabricated** — always
  computed from the real total using age/category logic in
  `lib/providers/travelerMapping.ts`, and labeled "Demo estimate" in the UI
  where relevant.

Flow: `app/page.tsx` (client) → POST `/api/trip-search` → `lib/search.ts`
(`searchTrip`, server-only, calls every provider in parallel, then calls the
optimizer agent) → provider adapters in `lib/providers/*` → response adapted
back to rich shape → rendered by `components/results/*` and
`components/optimizer/*`.

**Do not** call any provider or the OpenRouter agent from a client component —
API keys must stay server-side. This is already enforced by routing
everything through `app/api/trip-search` and `app/api/trip-optimizer-review`.

## Provider status (as of 2026-07-31)

| Category | Provider | Status |
|---|---|---|
| Flights | **Duffel** | Real, wired, self-serve signup works. Current token in `.env.local` is valid but **missing the `air.offer_requests.create` permission** — returns 403. Fix in the Duffel dashboard, not code. |
| Flights | Amadeus | Not usable. Self-serve sandbox was **decommissioned July 17, 2026**; now enterprise-sales-only. Code exists (`lib/providers/flights/amadeus.ts`) but will always report "Missing AMADEUS_CLIENT_ID" without an enterprise deal. |
| Flights | **TripWeaver Demo Transport** | Fallback, always runs, always succeeds. 4 synthetic routes (direct flight, connecting flight, train+flight via Berlin, overnight bus+flight), priced off traveler count. `lib/providers/transport/demoFlights.ts`. |
| Hotels | Booking.com Demand API | Not usable. Partner-gated, no credentials, and no accessible self-serve path found. Code exists but needs `bookingCityId` per destination via `TRIPWEAVER_LOCATION_HINTS_JSON` even if credentialed. |
| Hotels | Skyscanner Hotels | Not usable. Same partner-gating issue as Booking.com. |
| Hotels | **Hotelbeds / HBX Group API Suite** | **Identified but not implemented.** Verified live: `developer.hotelbeds.com/register` is genuinely self-serve (email/username/password only, free "Evaluation Plan" key, no business required). User has not registered yet. This is the next real integration to build once a key exists — no adapter code written for it yet. |
| Hotels | **TripWeaver Demo Stays** | Fallback, always runs, always succeeds. 5 synthetic hotels across star ratings. `lib/providers/accommodations/demoStays.ts`. |
| Packages | *(none)* | **Not implemented at all.** `packageProviders = []` in `lib/providers/index.ts`. The Package holidays results tab will always be empty. No demo fallback either. |
| Optimizer agent | **OpenRouter** | Real, wired, verified working end-to-end (`gpt-4o-mini` via `OPENROUTER_API_KEY`). Falls back to a local heuristic scorer if the key is missing or the call fails. `lib/optimizer/agent-review.ts`, UI in `components/optimizer/OptimizerAgentReview.tsx`. |

Mock providers from the original hackathon build (`lib/providers/transport/mock*.ts`,
`lib/providers/accommodation/mock*.ts`, `lib/providers/packages/mock*.ts`) are
**kept in the repo but not wired into `lib/providers/index.ts`** — they use the
old rich data model directly and are incompatible with the current real-provider
interface. Treat them as reference/history, not working code.

## What's implemented

**Search wizard** (`components/search/SearchPanel.tsx`, 4 steps):
- Step 1: origin/destination with real client-side autocomplete (`lib/cityData.ts`,
  ~130 major cities + IATA codes, `components/ui/CityAutocomplete.tsx`), dates,
  flexible-dates toggle
- Step 2: traveler counts, child/infant ages, room allocation
  (`TravelerSelector.tsx`, `RoomAllocator.tsx` — recently made compact)
- Step 3: budget **range** slider (dual-thumb, `components/ui/RangeSlider.tsx`,
  new `SearchCriteria.budgetMin` field), transport mode picker, accommodation
  standard as a visual star-rating card picker (not a `<select>`), luggage/package
  toggles, optimization priority checkboxes
- Step 4: read-only review summary, then submit

**Results**: complete trips / transport / accommodation / package tabs
(`components/results/*`), trip cards with expandable timeline + cost breakdown,
compare-up-to-3, save-to-localStorage (`lib/storage.ts`).

**Optimizer**: live weight sliders re-score client-side instantly
(`lib/scoring.ts`), separate "Trip Optimizer agent" panel that calls the real
OpenRouter-backed API on demand (button only appears when weights changed
since the last review — this is the part that replaced a fake hardcoded
"Agent active" badge from an earlier, disconnected build).

**Search → results flow**: after a successful search, the hero + wizard
collapse into a compact summary bar (`SearchSummaryBar` in `app/page.tsx`)
with route/dates/travelers/budget + an "Edit search" button that re-expands
the wizard, pre-filled. Background image changes to a real photo of the typed
destination (via LoremFlickr tag search, locked per-destination so it's stable
across re-renders — not a curated list, works for any city).

**Design system**: Tailwind tokens in `tailwind.config.ts` (navy/coral/sage
palette, `sageDark`/`accentSoft`/`surface` added for contrast fixes), shared
`Tooltip` component (`components/ui/Tooltip.tsx`) used to move field
descriptions off always-visible text and onto "?" affordances, animation
utilities (`fade-up`/`fade-in`/`scale-in`/`shimmer`) applied to step
transitions, card entrances, and loading states.

**No-results handling**: if every configured provider fails/returns nothing,
the UI shows an explicit per-provider status list (which key is missing, which
call failed) instead of silently showing nothing.

## What's NOT implemented / known gaps

- **Package holidays**: zero implementation, not even a demo provider. If you
  want this tab to ever show anything, start here.
- **Hotelbeds integration**: researched and confirmed viable, no code written.
  Needs a new file like `lib/providers/accommodations/hotelbeds.ts` following
  the existing `booking.ts`/`skyscanner-hotels.ts` pattern, registered in
  `lib/providers/index.ts`.
- **Duffel permission**: token needs `air.offer_requests.create` scope added
  in the Duffel dashboard before real flight data will flow (currently 403s
  and silently falls through to the demo transport provider).
- **Amadeus, Booking.com, Skyscanner**: dead ends for an individual/non-business
  user right now (see provider table). Don't spend time on these unless that
  changes.
- **No tests.** No unit tests, no e2e tests, no CI. Everything has been
  verified by manual browser testing during development.
- **No mobile-specific testing.** Responsive classes exist throughout but the
  mobile layout hasn't been explicitly click-tested in this project.
- **npm audit**: 12 vulnerabilities (mostly transitive deps), not addressed.
  Also one `EBADENGINE` warning (`eslint-visitor-keys` wants a newer Node).
- **`budgetMin`** only exists in the Step 3 budget-range slider UI right now
  (`lib/types.ts`, `lib/defaults.ts`, `components/search/SearchPanel.tsx`).
  It is **not** shown in the review step, the collapsed summary bar, results,
  or `TripSummaryRail`, and it's not read by scoring, validation, or the real
  API adapter (which only ever sends the max as `budget`). If you want the
  range to actually mean something beyond the slider, this needs threading
  through.
- **Demo fallback providers always run** alongside real ones, even once real
  credentials exist for a category — worth deciding later whether real data
  should suppress the demo provider for that category, or they should keep
  blending.

## Environment setup

Copy the relevant keys into `.env.local` (gitignored, never commit it):

```
DUFFEL_ACCESS_TOKEN=...        # real, needs air.offer_requests.create permission
OPENROUTER_API_KEY=...         # real, working
# Amadeus / Booking.com / Skyscanner: not worth setting until you have
# enterprise/partner access — see provider table above
```

Full variable list with defaults: `.env.example`.

## Known gotchas

- **Don't run `npm run build` while `npm run dev` is running** — they share
  `.next` and stepping on each other corrupts the dev server's webpack module
  registry (manifests as `TypeError: __webpack_modules__[moduleId] is not a
  function`). Fix: stop the dev server, `rm -rf .next`, restart.
- The mock providers under `lib/providers/{transport,accommodation,packages}/mock*.ts`
  are **not wired in** and use an incompatible older data model — don't try to
  register them in `lib/providers/index.ts` without adapting them first.

## Where to pick up work (good for splitting across parallel chats)

These are independent enough to hand to separate sessions:

1. **Hotelbeds integration** — register for a key, write the adapter, wire it
   into `lib/providers/index.ts` alongside the existing accommodation
   providers.
2. **Package holidays** — design + build from scratch, no existing real or
   demo provider to build on.
3. **Testing** — add a test runner and at least cover `lib/adapters/*` and
   `lib/scoring.ts` (pure functions, easy to unit test) plus a basic e2e smoke
   test of the search flow.
4. **Mobile QA pass** — click through the full flow at mobile viewport widths,
   fix what's broken.
5. **Dependency hygiene** — `npm audit fix`, address the Node engine warning.
