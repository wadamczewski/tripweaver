# TripWeaver

A travel-planning web app that lets a family compare flights, stays, and complete trip totals in one place — built as a hackathon prototype and then wired to real provider APIs.

## Run it

```bash
npm install
npm run dev
```

Without provider API keys the app still runs: each provider reports a clear config error (e.g. `Missing AMADEUS_CLIENT_ID`) instead of crashing, and the results screen shows an honest "no combined trip options yet" state with the per-provider status. Each category (flights, hotels) shows real provider results when any real provider succeeds; the built-in demo provider for that category only fills in when every real provider for it fails or isn't configured (`lib/search.ts`).

## Provider setup

Copy `.env.local` (gitignored) with the credentials in `.env.example`:

- Flights: **Duffel** (real, working — needs a token with the `air.offer_requests.create` permission), Amadeus (enterprise-only, not usable for self-serve accounts)
- Accommodation: **Hotelbeds** (real, working — self-serve at `developer.hotelbeds.com/register`, needs `HOTELBEDS_API_KEY`/`HOTELBEDS_SECRET` plus a `hotelbedsDestinationCode` hint per destination in `TRIPWEAVER_LOCATION_HINTS_JSON`; only Barcelona has one configured so far), Booking.com Demand API, Skyscanner Hotels (both partner-gated, not usable without a business account — see `PROJECT_STATUS.md`)
- Optimizer agent: OpenRouter (`OPENROUTER_API_KEY`) — falls back to a local heuristic scorer if unset

All provider calls happen server-side (`lib/providers/*`, called from `app/api/trip-search` and `app/api/trip-optimizer-review`). Never call them from client components.

## Architecture

- `app/page.tsx` — the search wizard → results flow
- `components/search`, `components/results`, `components/optimizer` — the UI, built against a rich local data model (per-traveler pricing, room allocation, timelines, cost breakdowns)
- `lib/types.ts` — that rich UI-facing data model
- `lib/trip/types.ts` — the thinner data model the real provider APIs actually return
- `lib/adapters/` — translates between the two: real provider results become rich `SearchResults`, with per-traveler price splits and timelines derived (and clearly estimated) from what the providers actually give us, not fabricated
- `lib/providers/` — real adapters (`flights/`, `accommodations/`) plus reference mock providers (`transport/`, `accommodation/`, `packages/`) kept for local development without API keys
- `lib/optimizer/agent-review.ts` — the Trip Optimizer agent (OpenRouter-backed, heuristic fallback), reviewed via `components/optimizer/OptimizerAgentReview.tsx`, shown as a one-line collapsible bar at the top of the results column (click to expand the full AI narrative)
- `lib/useDestinationImages.ts` — resolves the typed destination to real photos via Wikipedia's public REST API (no key needed) and rotates through them behind the whole app as one shared, fixed (non-scrolling) background layer; falls back to generic scenic photos if a destination has no Wikipedia match
- `components/results/HotelDetailsModal.tsx` — hover/tap modal over each accommodation card's hero photo: full photo gallery (lazy-loaded thumbnails, prev/next), real hotel details (room, board, cancellation policy), and a small OpenStreetMap embed at the hotel's real coordinates (currently just Hotelbeds); portaled to `document.body` over a blurred backdrop so it isn't clipped by the card

See `docs/unmocking.md` for provider wiring notes.

## Known limitations

- Package holidays are not yet wired to a real provider (the tab will be empty).
- Hotelbeds is real and verified working, but only for destinations with a `hotelbedsDestinationCode` configured in `TRIPWEAVER_LOCATION_HINTS_JSON` (currently just Barcelona) — other destinations fall back to demo stays. Booking.com and Skyscanner remain partner-gated and not usable without a business account.
- Per-traveler pricing, timelines, and cost-breakdown line items beyond the real transport/accommodation totals are estimates derived from age/category rules, not verified fares — this is flagged in the UI (`costAssumptions` on each trip).
- Origin/destination cities are resolved to IATA/location codes via `lib/cityData.ts` (~130 major cities). Cities outside that list fail with a clear error rather than guessing a code; add missing ones there or via `TRIPWEAVER_LOCATION_HINTS_JSON`.
- Location IDs for Booking.com and Skyscanner must be supplied per-city via `TRIPWEAVER_LOCATION_HINTS_JSON`; unmapped cities will fail with a clear error rather than guess an ID.
- Destination background photos depend on Wikipedia having an article (and at least one usable photo) for the typed destination; obscure or misspelled destinations fall back to generic scenic stock photos instead of a real, place-specific one.
