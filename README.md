# TripWeaver

A travel-planning web app that lets a family compare flights, stays, and complete trip totals in one place — built as a hackathon prototype and then wired to real provider APIs.

## Run it

```bash
npm install
npm run dev
```

Runs at `http://localhost:3210` (the port is set in `.claude/launch.json` / the `dev` script, not the Next.js default 3000).

**Or via Docker Compose**, if you'd rather start/stop it from Docker Desktop instead of a terminal:

```bash
docker compose up -d --build
```

Same app, same port (3210), hot-reload included (the source is bind-mounted, `node_modules`/`.next` are container-only so a macOS host and Linux container don't clash). `.env.local` is picked up automatically the same way `npm run dev` picks it up locally — nothing extra to configure. Stop it with `docker compose down`, or toggle it from Docker Desktop's UI once it's been started once. Rebuild after installing a new dependency with `docker compose up -d --build` again.

Without provider API keys the app still runs: each provider reports a clear config error (e.g. `Missing AMADEUS_CLIENT_ID`) instead of crashing, and the results screen shows an honest "no combined trip options yet" state with the per-provider status — or, if some providers *did* return results but the budget/transport-mode filters excluded every combination, a distinct "no trips match your current filters" notice instead, since the raw results are still real and browsable in the Transport/Accommodation tabs. Flights and hotels have no demo fallback — Duffel and Hotelbeds/SerpApi are real and working, so if every configured real provider for a category fails, that category is honestly empty rather than showing synthetic data.

## Provider setup

Copy `.env.local` (gitignored) with the credentials in `.env.example`:

- Flights: **Duffel** (real, working — needs a token with the `air.offer_requests.create` permission), Amadeus (enterprise-only, not usable for self-serve accounts)
- Ground transport (car/bus/train, any origin/destination): **OpenRouteService** (real driving distance/duration, self-serve free signup at `openrouteservice.org/dev/#/signup`, needs `OPENROUTESERVICE_API_KEY`) + **OSM Nominatim** for geocoding free-text places outside `lib/cityData.ts` (no key needed). Prices are clearly-labeled estimates derived from the real distance, not live fares — no self-serve API returns real worldwide point-to-point ticket prices for arbitrary train/bus/shuttle routes (Rome2Rio and comparable platforms are partner/sales-gated). See `PROJECT_STATUS.md` for the research behind this.
- Connected transport (e.g. Zakopane → Kraków airport → Barcelona by flight): same OpenRouteService/Nominatim stack, chained to a **real Duffel flight** from up to 3 nearby airport candidates (not just the nearest one — the closest airport isn't always the cheapest connection, so all viable candidates are shown to compare). Only the transfer leg's price is estimated; the flight price is real.
- Accommodation: **Hotelbeds** (real, working — self-serve at `developer.hotelbeds.com/register`, needs `HOTELBEDS_API_KEY`/`HOTELBEDS_SECRET` plus a `hotelbedsDestinationCode` hint per destination in `TRIPWEAVER_LOCATION_HINTS_JSON`; only Barcelona has one configured so far), **Google Hotels via SerpApi** (real, working — self-serve at `serpapi.com`, needs `SERPAPI_KEY`; free tier is 250 searches/month; works for any destination, no per-city hint needed; comparison-only, no booking capability), Booking.com Demand API, Skyscanner Hotels, RateHawk (all partner-gated — RateHawk's "self-serve Sandbox" still requires a registered business with a tax ID at signup — not usable without a business account, see `PROJECT_STATUS.md`)
- Package holidays: **DACH Package Holidays via Apify** (real, working — self-serve at `apify.com`, needs `APIFY_API_TOKEN`; pay-per-event pricing, only queried when the "Package holidays" toggle is on; real bundled prices from TUI/DERTOUR/weg.de/ab-in-den-urlaub.de/alltours, but only for German-region departure airports — see `PROJECT_STATUS.md` for the ToS caveat: this is an unofficial scraper, not a licensed feed). Package holidays aren't just a separate tab: each one within budget is also merged into "Complete trips" as a regular trip option (`kind: "package"`) and ranked by the Trip Optimizer agent right alongside self-organized flight+hotel combos, using its own gallery/details modal identical to a hotel's.
- Optimizer agent: OpenRouter (`OPENROUTER_API_KEY`) — falls back to a local heuristic scorer if unset

All provider calls happen server-side (`lib/providers/*`, called from `app/api/trip-search` and `app/api/trip-optimizer-review`). Never call them from client components.

## Architecture

- `app/page.tsx` — the search wizard → results flow
- `components/search`, `components/results`, `components/optimizer` — the UI, built against a rich local data model (per-traveler pricing, room allocation, timelines, cost breakdowns)
- `lib/types.ts` — that rich UI-facing data model
- `lib/trip/types.ts` — the thinner data model the real provider APIs actually return
- `lib/adapters/` — translates between the two: real provider results become rich `SearchResults`, with per-traveler price splits and timelines derived (and clearly estimated) from what the providers actually give us, not fabricated
- `lib/providers/` — real adapters (`flights/`, `accommodations/`, `packages/`); `transport/` also holds `ground-transport.ts` (real, wired) alongside unused reference mock providers from the original hackathon build, not wired into `lib/providers/index.ts`; `accommodation/` (singular) is entirely unused mock providers
- `lib/providers/geocoding.ts` + `lib/providers/routing.ts` + `lib/providers/transport/ground-transport.ts` — car/bus/train options for **any** origin/destination, not just `lib/cityData.ts`'s ~130 airport cities: geocodes free text via OSM Nominatim (falls back from the curated city list, no key needed), gets a real driving distance/duration from OpenRouteService (`OPENROUTESERVICE_API_KEY`), and derives clearly-labeled estimated prices from that real distance — no self-serve API returns real worldwide point-to-point train/bus/shuttle fares
- `lib/providers/transport/connected-flights.ts` — when one end of the trip has no airport, chains an estimated ground-transfer leg to a real Duffel flight from up to 3 nearby candidate airports (`lib/cityData.ts`'s `findNearestAirportCities`), so e.g. Zakopane → Barcelona surfaces "via Kraków", "via Katowice", "via Rzeszów" as separate, comparable options instead of picking one silently
- `lib/optimizer/agent-review.ts` — the Trip Optimizer agent (OpenRouter-backed, heuristic fallback), reviewed via `components/optimizer/OptimizerAgentReview.tsx`, shown as an always-expanded card in the results grid's third (right) column — showing the actual recommended trip (image, price, provider links) plus separate "Why this trip" and "Trade-offs" subsections (the agent returns these as distinct fields, not one blended paragraph), blurred with a spinner overlay while a new review is in flight, and briefly glowing (5 pulses) the moment a review completes. Its ranking is authoritative: `applyAgentRanking()` in `lib/scoring.ts` reorders the displayed trip list to match. Its data-gap/caveat notes (`review.warnings`) render just below it in the same right column (`AgentNotesPanel` in `app/page.tsx`); the column scrolls internally (`overflow-y-auto`) since the always-expanded card routinely exceeds viewport height
- `components/optimizer/OptimizerPanel.tsx` — the left-column priority controls: five Low/Balanced/High segmented toggles per factor (not free-dragging percent sliders — see `PROJECT_STATUS.md`'s 2026-08-03 note for why), laid out 2-per-row to keep the panel compact, plus the "Review updated ranking" button (centered under "Reset to defaults") that triggers a fresh agent review — kept next to the controls that actually affect it rather than inside the agent card itself. Nothing renders below that button — the old score-breakdown/"Why this trip"/"Worth checking" section was removed as unwanted; the top "X/100" badge reads the trip's real precomputed score instead. The results page uses a real three-column CSS grid (`400px_minmax(0,1fr)_380px`, both side columns sticky) from `lg:` (1024px) up, widened to `max-w-[1800px]` so the third column never shrinks the center results column
- **Progressive search**: `POST /api/trip-search` returns only transport + accommodation (a couple of seconds) — the results page renders immediately from that. Package holidays (`POST /api/trip-packages`, can take up to ~2 minutes) and the Trip Optimizer agent review (`POST /api/trip-optimizer-review`, ~20-60s) both run in the background afterward and merge into the page as they resolve, each with its own "still searching" indicator (Package holidays tab, the optimizer status bar) instead of blocking the whole page behind one spinner
- `lib/useDestinationImages.ts` — resolves the typed destination to real photos via Wikipedia's public REST API (no key needed) and rotates through them behind the whole app as one shared, fixed (non-scrolling) background layer; falls back to generic scenic photos if a destination has no Wikipedia match
- `lib/useNearestCity.ts` — defaults the "Departure city" field to the user's real location via the browser's Geolocation API, matched against `lib/cityData.ts`'s 132 cities (each with real lat/lng) by great-circle distance; only applies while the field is still untouched, and silently does nothing if permission is denied or unavailable
- `components/results/HotelDetailsModal.tsx` — hover/tap modal over each accommodation card's hero photo: full photo gallery (lazy-loaded thumbnails, prev/next), real hotel details (room, board, cancellation policy), and a small OpenStreetMap embed at the hotel's real coordinates (currently just Hotelbeds); portaled to `document.body` over a blurred backdrop so it isn't clipped by the card
- `lib/useInfiniteReveal.ts` — reveals large already-fetched result lists 20 at a time (scroll or "Show more" click) instead of mounting hundreds of cards at once; provider adapters return everything a single API call gives them (real volumes: ~60 flights, ~200 hotels), uncapped
- `components/results/AllHotelsMap.tsx` + `HotelMapCanvas.tsx` — "Show all N on map" button on the Accommodation tab: every already-fetched hotel with coordinates as a zoomable Leaflet/OpenStreetMap pin (no API key, no re-fetching), with a details-and-photos pane for whichever pin is selected

See `docs/unmocking.md` for provider wiring notes.

## Known limitations

- Package holidays only return real results for German-region departure airports (FRA, MUC, DUS, CGN, etc.) — the DACH tour operators behind this provider don't serve other origins, so e.g. the app's default Szczecin origin returns 0 packages. No demo fallback, so the tab is honestly empty rather than synthetic.
- Hotelbeds is real and verified working, but only for destinations with a `hotelbedsDestinationCode` configured in `TRIPWEAVER_LOCATION_HINTS_JSON` (currently just Barcelona) — other destinations rely on SerpApi's free-text coverage instead, since it doesn't need a per-city hint. Booking.com and Skyscanner remain partner-gated and not usable without a business account.
- Per-traveler pricing, timelines, and cost-breakdown line items beyond the real transport/accommodation totals are estimates derived from age/category rules, not verified fares — this is flagged in the UI (`costAssumptions` on each trip).
- Flights are still resolved to IATA codes via `lib/cityData.ts` (~130 major cities) — a place with no airport correctly returns zero flight results rather than guessing a code. Ground transport (car/bus/train) is **not** limited to that list: it geocodes any typed place via Nominatim, so an origin/destination outside `CITY_DATABASE` still gets real distance-based transport options, just no flights.
- Location IDs for Booking.com and Skyscanner must be supplied per-city via `TRIPWEAVER_LOCATION_HINTS_JSON`; unmapped cities will fail with a clear error rather than guess an ID.
- Destination background photos depend on Wikipedia having an article (and at least one usable photo) for the typed destination; obscure or misspelled destinations fall back to generic scenic stock photos instead of a real, place-specific one.
- "Preferred transport" has real effect for Flight (Duffel) and, as of 2026-08-02, Car/Bus/Train too (the ground-transport provider, once `OPENROUTESERVICE_API_KEY` is set) — Ferry still returns zero real results, since no real ferry data source is wired in.
- Ground-transport prices (car/bus/train) are estimates derived from a real driving distance, not live fares — see the provider list above.
- "Flexible dates" is not wired to any provider — neither Duffel nor Hotelbeds/SerpApi support a single-call nearby-dates query; doing this for real would mean multiple date-shifted requests per search.
- Accommodation-standard (star rating) filtering is real for SerpApi (verified) but unconfirmed for Hotelbeds — its test account is currently quota-exhausted account-wide (core search included, not just images), blocking live verification of its documented category filter.
