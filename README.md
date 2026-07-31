# TripWeaver

A travel-planning web app that lets a family compare flights, stays, and complete trip totals in one place — built as a hackathon prototype and then wired to real provider APIs.

## Run it

```bash
npm install
npm run dev
```

Without provider API keys the app still runs: each provider reports a clear config error (e.g. `Missing AMADEUS_CLIENT_ID`) instead of crashing, and the results screen shows an honest "no combined trip options yet" state with the per-provider status.

## Provider setup

Copy `.env.local` (gitignored) with the credentials in `.env.example`:

- Flights: Amadeus, Duffel
- Accommodation: Booking.com Demand API, Skyscanner Hotels
- Optimizer agent: OpenRouter (`OPENROUTER_API_KEY`) — falls back to a local heuristic scorer if unset

All provider calls happen server-side (`lib/providers/*`, called from `app/api/trip-search` and `app/api/trip-optimizer-review`). Never call them from client components.

## Architecture

- `app/page.tsx` — the search wizard → results flow
- `components/search`, `components/results`, `components/optimizer` — the UI, built against a rich local data model (per-traveler pricing, room allocation, timelines, cost breakdowns)
- `lib/types.ts` — that rich UI-facing data model
- `lib/trip/types.ts` — the thinner data model the real provider APIs actually return
- `lib/adapters/` — translates between the two: real provider results become rich `SearchResults`, with per-traveler price splits and timelines derived (and clearly estimated) from what the providers actually give us, not fabricated
- `lib/providers/` — real adapters (`flights/`, `accommodations/`) plus reference mock providers (`transport/`, `accommodation/`, `packages/`) kept for local development without API keys
- `lib/optimizer/agent-review.ts` — the Trip Optimizer agent (OpenRouter-backed, heuristic fallback), reviewed via `components/optimizer/OptimizerAgentReview.tsx`

See `docs/unmocking.md` for provider wiring notes.

## Known limitations

- Package holidays are not yet wired to a real provider (the tab will be empty).
- Per-traveler pricing, timelines, and cost-breakdown line items beyond the real transport/accommodation totals are estimates derived from age/category rules, not verified fares — this is flagged in the UI (`costAssumptions` on each trip).
- Location IDs for Booking.com and Skyscanner must be supplied per-city via `TRIPWEAVER_LOCATION_HINTS_JSON`; unmapped cities will fail with a clear error rather than guess an ID.
