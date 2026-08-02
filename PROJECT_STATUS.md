# TripWeaver — Project Status

Last updated: 2026-08-02. This file is meant to give a fresh chat session (or a
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

No API keys are required for the app to *run* — each unconfigured provider
reports a clear config error instead of crashing — but as of 2026-08-02
there's no synthetic demo fallback for flights or hotels anymore (see the
dated note below): without real credentials for at least one provider per
category, that category is honestly empty rather than showing fabricated
data. The optimizer agent is the exception — it still falls back to a
local heuristic scorer (not fabricated data, just a simpler ranking
formula) when `OPENROUTER_API_KEY` is unset.

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
  `lib/providers/travelerMapping.ts`. (Was also labeled "Demo estimate" in
  the UI — removed 2026-08-02, see the dated note below: the label was
  hardcoded everywhere regardless of whether the underlying data was real.)

Flow (as of 2026-08-02, see the "Progressive search" note below for why):
`app/page.tsx` (client) → POST `/api/trip-search` → `lib/search.ts`
(`searchTripCore`, server-only, calls transport + accommodation providers in
parallel — fast, no packages, no agent review) → provider adapters in
`lib/providers/*` → response adapted back to rich shape → rendered
immediately by `components/results/*`. Two more requests fire in the
background right after that, neither blocking the results page: POST
`/api/trip-packages` (`searchPackageHolidays`) and POST
`/api/trip-optimizer-review` (`reviewTripOptionsWithAgent`, fired
automatically by `components/optimizer/OptimizerAgentReview.tsx` itself, not
just on manual weight-tuning). Each merges into the displayed results as it
resolves.

**Do not** call any provider or the OpenRouter agent from a client component —
API keys must stay server-side. This is already enforced by routing
everything through `app/api/trip-search`, `app/api/trip-packages`, and
`app/api/trip-optimizer-review`.

## Provider status (as of 2026-07-31)

| Category | Provider | Status |
|---|---|---|
| Flights | **Duffel** | **Real, wired, verified working end-to-end** (2026-07-31). Token in `.env.local` now has the `air.offer_requests.create` permission. |
| Flights | Amadeus | Not usable. Self-serve sandbox was **decommissioned July 17, 2026**; now enterprise-sales-only. Code exists (`lib/providers/flights/amadeus.ts`) but will always report "Missing AMADEUS_CLIENT_ID" without an enterprise deal. |
| Hotels | Booking.com Demand API | Not usable. Partner-gated, no credentials, and no accessible self-serve path found. Code exists but needs `bookingCityId` per destination via `TRIPWEAVER_LOCATION_HINTS_JSON` even if credentialed. |
| Hotels | Skyscanner Hotels | Not usable. Same partner-gating issue as Booking.com. |
| Hotels | **Hotelbeds / HBX Group API Suite** | **Real, wired, verified working end-to-end** (2026-07-31). `lib/providers/accommodations/hotelbeds.ts`, registered in `lib/providers/index.ts`. `HOTELBEDS_API_KEY` + `HOTELBEDS_SECRET` are set in `.env.local` (signature auth: SHA-256 of `apiKey+secret+unixTimestamp`, sent as `Api-key`/`X-Signature` headers) and `TRIPWEAVER_LOCATION_HINTS_JSON` has a `hotelbedsDestinationCode` for Barcelona (`"BCN"` — confirmed via a live call; Hotelbeds destination codes are their own codification, not IATA, so other cities need their own code looked up before they'll return results). Returns real hotels (name, star category, room type, price, and a real per-hotel photo via a bulk Content API call — see the "Real per-hotel photos" note below). |
| Hotels | **Google Hotels (SerpApi)** | **Real, wired, verified working end-to-end** (2026-08-01). `lib/providers/accommodations/serpapi-hotels.ts`, needs `SERPAPI_KEY`. Free tier: 250 searches/month, recurring. Not a licensed wholesaler feed — it's SerpApi's structured JSON of Google Hotels' own search results (comparison-only, no booking capability; `bookingUrl` points at the hotel's own site/listing, not an affiliate booking link). Takes a free-text destination (`q`) instead of a per-city code, so — unlike Hotelbeds — it isn't limited to destinations with a hint configured. Some premium chain hotels (seen live: Sofitel, Radisson Blu, Hilton) come back from Google with no rate at all for a given query; these are filtered out rather than shown with a fabricated PLN 0 price. |
| Packages | **DACH Package Holidays (Apify)** | **Real, wired, verified working end-to-end** (2026-08-01). `lib/providers/packages/apify-dach-packages.ts`, needs `APIFY_API_TOKEN`. Real bundled prices from TUI/DERTOUR/weg.de/ab-in-den-urlaub.de/alltours — but only for German-region departure airports (see the dated note below); Szczecin returns 0. Unofficial third-party scraper, not a licensed feed — see the ToS caveat in the dated note. No demo fallback still — if this provider fails/returns nothing, the tab is honestly empty rather than showing synthetic data. As of 2026-08-02, within-budget packages are also merged into "Complete trips" and ranked by the optimizer agent alongside self-organized combos, not just shown in their own tab — see the dated note below. |
| Optimizer agent | **OpenRouter** | Real, wired, verified working end-to-end (`gpt-5-mini` via `OPENROUTER_API_KEY`, configurable via `OPENROUTER_MODEL`). Falls back to a local heuristic scorer if the key is missing or the call fails. As of 2026-08-01 its ranking is authoritative over the displayed trip order (previously computed but discarded — see the dated note below). `lib/optimizer/agent-review.ts`, UI in `components/optimizer/OptimizerAgentReview.tsx`. |
| Transport (non-flight) | **Ground transport (OpenRouteService)** | **Real routing, estimated pricing — wired 2026-08-02, not yet live-verified** (needs the user's own `OPENROUTESERVICE_API_KEY`, a free self-serve signup — account creation isn't something an agent does, see the dated note below). `lib/providers/transport/ground-transport.ts`. Covers transfer/bus/train for **any** origin/destination, including places outside `CITY_DATABASE` — geocoded via OSM Nominatim (keyless) instead of requiring an IATA code. Distance/duration are real for the private-transfer offer (OpenRouteService driving directions, mode `"transfer"` — a real bug caught live during the first browser test: this was originally tagged `mode: "car"`, which the UI's transport picker treats as a *separate*, unchecked-by-default "self-drive" checkbox from "Transfer" (door-to-door) — silently excluding it from a default search despite "Transfer" being checked; fixed same-session); all prices (transfer/bus/train) and bus/train durations are heuristic estimates from that real distance, clearly labeled as such — no self-serve API returns real worldwide point-to-point ticket prices for arbitrary train/bus/shuttle routes (Rome2Rio and comparable platforms are partner/sales-gated, not self-serve; confirmed live 2026-08-02, see the dated note below). |

**Progressive search — decoupled packages + agent review from the results
page (2026-08-02).** Investigated a real complaint: a Szczecin→Barcelona
search "takes ages" to reach the results page. Measured live (Docker
container, server-side timing logs) rather than guessing:

- Transport (Duffel) + accommodation (Hotelbeds/SerpApi) combined: ~1-4s.
  Never the bottleneck.
- **Trip Optimizer agent (`gpt-5-mini`) alone: 20-60s**, ranking the full
  ~500-576 trip-combo payload — the dominant cost even with packages off.
- **Package holidays (Apify DACH scraper): up to 65-140s**, and the old code
  ran it in the same blocking `Promise.all` as the initial search, so its
  full duration was added on top of everything else. Worse: for Szczecin
  specifically (this app's default origin), packages **always return zero
  results** — confirmed live, a full ~112s wait ended in "No match yet"
  every time, since the Apify actor only covers German-region departure
  airports (see the dated note further down). The default search was
  paying up to two minutes for a category that could never return anything.

**Fix**: split what was one blocking `searchTrip()` call into three
independent pieces (`lib/search.ts`): `searchTripCore()` (transport +
accommodation, ~1-4s), `searchPackageHolidays()`, and the pre-existing
`reviewTripOptionsWithAgent()`. `app/page.tsx` now calls only the core search
before flipping to the results view; packages (`POST /api/trip-packages`, new
route) and the agent review (`POST /api/trip-optimizer-review`, already
existed for manual weight-tuning — `OptimizerAgentReview.tsx` now also fires
it itself on mount instead of waiting to be told) both run in the background
and merge into `realResults` as they resolve, via ordinary React state
updates — no polling, no websockets. The results page is now interactive in
a few seconds instead of up to ~113s.

UI treats "still loading" and "genuinely found nothing" as different states
instead of one permanent "Pending": the Package holidays tab shows a spinner
+ explanatory copy while `isPackagesPending`, then either real listings or an
honest "No operator returned a bundled offer" once the request actually
finishes. The "Package holiday" recommendation tile (top of the Complete
Trips tab) had a separate pre-existing bug worth noting — `getRecommendationTiles`
sourced it from `options.find(o => o.kind === "package" || o.packageHoliday)`,
but nothing in `tripOptions` (self-organized combos) ever had `kind:
"package"`, so that tile always read "Pending" regardless of real package
state. This is now fixed for real (not just papered over) by the package
holidays merge described in the next dated note below, which makes
`kind: "package"` entries genuinely exist in `tripOptions`.

One React-specific bug caught during live verification: the agent-review
auto-fetch effect fired twice per search (two real, billed OpenRouter calls,
visible as two `POST /api/trip-optimizer-review` log lines ~20-26s apart) —
`next.config.mjs` has `reactStrictMode: true`, which double-invokes effects
in dev to catch missing-cleanup bugs, and a plain state-guarded `useEffect`
isn't proof against that for a non-idempotent side effect. Fixed with a ref
(`autoRequestedForRef`) set synchronously inside the effect body and keyed on
the `tripOptions` array reference — refs survive Strict Mode's simulated
remount on the same fiber, so the guard holds across the double-invoke.
Verified live: exactly one `POST /api/trip-optimizer-review` per search
afterward.

**Package holidays merged into "Complete trips" + a real currency bug fix
(2026-08-02).** Follow-up from a live bug report: a user searching with a
12,000 PLN budget could see real ~2,000 EUR packages in the Packages tab,
but (a) the price wasn't converted to PLN for comparison, and (b) packages
never appeared in "Complete trips" at all, so the AI agent never considered
them against self-organized flight+hotel combos.

- **Currency bug, root cause**: `toRichMoney()` (`lib/adapters/results.ts`)
  looked like a conversion function but wasn't one — it just tagged an
  offer's amount with whatever currency the offer already had (or the
  fallback), never actually calling a conversion. A EUR-priced package
  displayed as "PLN 2000" instead of ~8,500 PLN. This affected every
  provider's price, not just packages, but only became visible with
  Apify's EUR-priced packages since Duffel/Hotelbeds/SerpApi already
  return PLN for a PLN search. Fixed by actually calling `convertMoney`
  (`lib/currency.ts`, already existed and was already used correctly
  elsewhere — just never wired into this one function).
- **Packages merged into `tripOptions`**: `lib/types.ts`'s `TripOption`
  already had `kind: "self-organized" | "package"` and an optional
  `packageHoliday` field, and several helpers (`getPrimaryTransportLabel`,
  `getProviderLabel`, `getLuggageLabel`, `buildRecommendationBadges`) were
  already package-aware — all dead code until now, clearly scaffolded for
  exactly this. `toSearchResults` now builds a `TripOption` per package
  holiday (`toPackageTripOption`), using a synthesized `AccommodationOption`
  proxy (`packageAsAccommodation`, exported) since a package's hotel fields
  map onto that shape directly. Merged alongside self-organized combos,
  scored by the same `scoreTripOptions`, ranked by the same agent. Real
  flight duration isn't in the package data, so `totalDurationMinutes`
  defaults to 240 — the same "unknown duration" convention already used
  for transport offers missing real timing, not a new fabrication.
  Budget-filtered the same way self-organized combos already are
  server-side (`isWithinBudget`, checked against the *converted* price) —
  but only for this merged comparison; the dedicated Packages tab still
  shows every real result found regardless of budget, unchanged.
- **Agent awareness**: `reviewTripOptionsWithAgent` (`lib/optimizer/agent-review.ts`)
  now also accepts `packageOptions` and includes them in the same prompt as
  a second category, asking the model to rank both into one combined list
  rather than treating packages as a separate concern — the system prompt
  explicitly says package duration is unknown (treat as average) and that
  an included airport transfer should count toward familyFit. Package
  prices are converted (`lib/providers/fx.ts`'s `convertMoney`) before
  either the prompt or the no-API-key heuristic fallback scores them, for
  the same reason as the rich-UI fix above. Verified live: the agent
  correctly ranked "0 trips + 60 packages" for a Berlin search and picked a
  specific package by its real ID, with its total price shown in PLN.
  Because packages (up to ~2 minutes) usually resolve well after the first
  agent review already ran (~20-60s) — see the progressive-search note
  above — `OptimizerAgentReview.tsx` now also auto-fires a **second**
  review the first time non-empty packages arrive after an initial review
  already completed, so packages that resolve late still get a fair shot at
  being the recommendation instead of being silently excluded by timing.
  Guarded with the same ref-based pattern as the Strict Mode fix above to
  avoid a redundant call when packages happen to already be ready before
  the first review even fires.
- **Package holidays get the same gallery/modal as hotels**: rather than
  building a second modal component, `PackageHolidayList.tsx` now wraps
  each package's hero photo in the existing `HotelDetailsModal`, passing
  the same `packageAsAccommodation` proxy used for the merge above — full
  photo gallery (the Apify actor's `hotel.images` array was already being
  fetched but only `images[0]` was kept; now exposed as `imageUrls` too),
  real room/board/cancellation details, same "location not provided"
  placeholder as any hotel without coordinates (Apify doesn't return
  package hotel coordinates). Verified live: a package's photo badge
  correctly read "+9" and opened a 10-photo gallery identical in behavior
  to a real Hotelbeds listing.

**Fixed the agent's ranking looking price-only regardless of the weights
(2026-08-02).** User feedback: "I get an impression that you always order
the list based on price and it's not the only criteria, we have weights for
that ordering." Two real, compounding causes, not one:

1. **`toRealWeights()` (`lib/adapters/criteria.ts`) had a broken mapping.**
   The rich UI's 5 sliders (price/travelTime/convenience/hotelQuality/
   sustainability) and the real agent's 5 axes (price/speed/comfort/
   luggage/familyFit) only have 3 clean 1:1 matches — the old code mapped
   the other two UI sliders onto the other two agent axes anyway just to
   fill them in: `sustainability -> luggage`. A user boosting "lowest
   carbon footprint" made the agent think they cared about checked-luggage
   inclusion instead — a meaningless signal, which meant `luggage` carried
   no real information and `price` ended up mattering more than the UI
   implied. Fixed: `convenience -> familyFit` (defensible — fewer transfers
   is genuinely part of "lower friction for children"), `luggage` is now
   driven by the actual "Checked luggage" toggle (`criteria.checkedLuggage`,
   a real signal for what that axis means) instead of an unrelated slider,
   and `sustainability` is left unmapped rather than forced onto something
   arbitrary — it still drives the local client-side score
   (`lib/scoring.ts`), just has no real counterpart on the agent's side.
2. **The agent had no concrete number to anchor to.** Even with weights
   fixed, asking an LLM to rank 500+ items against five qualitative
   descriptions in one pass leaves a lot of room for it to fall back on
   whatever's easiest to compare at a glance — price. Fixed by computing
   the same weighted score already used for the no-API-key heuristic
   fallback (`fallbackScore`/`fallbackScorePackage` in
   `lib/optimizer/agent-review.ts`) for every option and including it in
   the prompt as `localScore` (0-1, all five weighted axes already
   combined), with the system prompt now explicitly instructing the model
   to sort by it first and only reorder for things it can't see (a real
   warning, a policy detail) — not silently revert to price. Both call
   sites (the real prompt and the heuristic fallback) now share one
   `computeRankingContext()` helper so they can't drift apart on
   cheapest/fastest baselines or package currency conversion.

Verified live, same search, weights changed mid-session: with default
balanced weights the agent picked "Domo" (a mid-price, mid-rated hotel).
After setting price to 0% and hotel quality to 75% and re-reviewing, it
picked a *different, more expensive* trip — "Air Penedes (4★), costs 73 PLN
more than the cheapest option" — with the agent's own headline reading
"Comfort-first pick". Confirms the ranking genuinely responds to weights
now rather than defaulting to cheapest regardless of what's dialed up.

Also reconfirmed while investigating this: the two-phase agent trigger
(fire the first review as soon as flights+hotels are ready, without waiting
on packages; fire a second review only once packages have arrived *and*
the first run has already completed) was raised as a requirement again but
was already correct from the 2026-08-02 progressive-search work above — no
change needed there, just re-verified live.

**Fixed `combineOptions` always producing zero trips for a budget the real
data could clearly satisfy (2026-08-02).** User caught this live: a Berlin
search returned 1688 real flights and 185 real hotels, but "Complete
trips" showed 0 — reproduced from an earlier "you should never see the
blocking no-results page" fix, but that fix only addressed the *page*, not
the actual cause. Root cause: `combineOptions` (`lib/search.ts`) built its
576-combo cross-product from `transports.slice(0, 24)` and
`accommodations.slice(0, 24)` — and since both arrays are pre-sorted
cheapest-first, that's always the cheapest 24 of each, never a wider
sample. Measured live: the cheapest 24 flights topped out at 427 PLN, the
cheapest 24 hotels at 993 PLN — so the priciest combo the cross-product
could ever produce was 1420 PLN, well under a 4000 PLN `budgetMin`. Every
one of the 576 combos got rejected as "too cheap", even though the full
1688×185 dataset obviously contains real combos in the 4000-12000 PLN
range — the cross-product just never considered them.

Fixed with `stratifiedSample()`: instead of the first N items, evenly
spreads N picks across the full (still price-sorted) list, so the sampled
transports and accommodations span from the cheapest real option up
toward the most expensive one, not just the floor of the price range.
Verified live, same Berlin search, no other changes: 428 real trip combos
now, with a real cheapest (PLN 7,104) and fastest (2h 45m) both inside the
requested budget.

**Removed the "Demo estimate" label everywhere (2026-08-02).** Another real
bug, not just a copy change: `DEFAULT_ESTIMATE_LABEL = "Demo estimate"`
(`components/results/helpers.ts`) was the default for an `estimateLabel`
prop threaded through seven components (`TripOptionCard`,
`AccommodationList`, `TransportOptionList`, `PackageHolidayList`,
`CostBreakdown`, `Timeline`, `CompareBar`) — and nothing ever overrode it.
`app/page.tsx` never passed `estimateLabel` down to `ResultsTabs` at all, so
every card showed "Demo estimate" unconditionally, including real Duffel/
Hotelbeds/SerpApi/Apify results throughout this entire session's testing.
Removed the prop and its rendering from all seven components rather than
leave dead plumbing behind. Also removed two adjacent, same-spirit issues
found while sweeping for this: `OptimizerPanel`'s scenario cards had a
`confidence: "Trip result" | "Demo estimate"` badge with the same
always-"Demo estimate"-unless-a-real-candidate-exists pattern (removed the
field and badge entirely), and `SearchPanel`'s step 4 description read "run
the complete demo comparison" despite the wizard always running a real
search (reworded to just "comparison"). `SearchPanel`'s separate
`demoDataLabel` prop was already dead code (declared, never rendered) —
removed along with it. Verified live: full page text contains no "Demo
estimate"/"DEMO ESTIMATE" anywhere post-search, cards and the compare bar
render cleanly with the label simply absent (no replacement copy invented
where none was asked for).

**Removed the demo flights/hotels providers (2026-08-02).** User request:
real data is wired up and working for both categories, so the synthetic
fallback is no longer needed. Deleted `lib/providers/transport/demoFlights.ts`
(4 synthetic routes) and `lib/providers/accommodations/demoStays.ts` (5
synthetic hotels) outright, unregistered them from `transportProviders`/
`accommodationProviders` in `lib/providers/index.ts`, and removed the
now-dead demo-suppression logic in `lib/search.ts`
(`offersExcludingSuppressedDemo`, `DEMO_TRANSPORT_PROVIDER_ID`,
`DEMO_ACCOMMODATION_PROVIDER_ID`) that used to blend/suppress them against
real results. Real behavior change, not just cleanup: if every configured
real provider for flights or hotels fails (bad credentials, provider
outage, etc.), that category is now honestly empty instead of silently
falling back to synthetic data — same "no fabricated data" principle
already applied to packages (which never had a demo fallback to begin
with). The mock provider files from the original hackathon build
(`lib/providers/transport/mock*.ts`, `lib/providers/accommodation/mock*.ts`)
were already unregistered/unused before this and are untouched — this only
removed the two demo providers that were actually wired in and running.

**Trip Optimizer agent panel redesign (2026-08-02).** User request: the
expanded panel only ever showed prose (headline + one summary paragraph),
with no view of what was actually being recommended, no split between "why
this pick" and "what you give up", and no indication of loading state
beyond a status pill. Three real changes, not just styling:

1. **`OptimizerAgentReview` (the type, `lib/trip/types.ts`) gained a
   `tradeoffs: string[]` field**, separate from `summary`. The agent's
   system prompt (`lib/optimizer/agent-review.ts`) now explicitly asks for
   two distinct pieces of reasoning — why the pick fits the weights vs.
   what it gives up compared to other strong options — instead of one
   blended paragraph the UI would have had to guess how to split. The
   no-API-key heuristic fallback synthesizes real (not fabricated)
   tradeoffs the same way `lib/adapters/results.ts` already does for trip
   cards: comparing the winner's price/duration against the cheapest/
   fastest option actually in the result set.
2. **The panel now shows the actual recommended trip**, not just text:
   image, total + per-person price, transport/hotel summary, score, and
   real "Open at provider" links when the underlying offer actually has a
   `bookingUrl` (Duffel and Hotelbeds don't set one currently, verified by
   reading both adapters — the section honestly doesn't render rather than
   showing a fake link). Wired via a new `recommendedTrip` prop:
   `app/page.tsx` passes its already-computed `featuredTrip`, which
   `applyAgentRanking` (`lib/scoring.ts`) guarantees is the agent's actual
   pick whenever a review exists — no separate lookup needed.
3. **The panel auto-expands the moment a review completes** (first pass or
   a later re-review) instead of staying collapsed until the user notices,
   and **blurs its existing content with a spinner overlay while
   re-reviewing** instead of swapping to a bare loading state — so a
   weight change or newly-arrived packages don't yank the previous
   recommendation away before the new one is ready.

Verified live: initial review auto-expanded showing a real Barcelona hotel
photo, price, and a "Why this trip"/"Trade-offs" split with genuine
per-factor reasoning ("wins on comfort... trade-off: not the absolute
cheapest, a cheaper combo exists at ≈4,085 PLN with a lower localScore").
Zeroing the price weight and maxing hotel quality, then re-reviewing,
correctly blurred the stale card with "Re-ranking with the latest
options…" and then swapped to a different, higher-comfort pick with
updated reasoning.

**Accommodation-standard filter actually fixed for real, plus a
guaranteed safety net (2026-08-02).** User caught this live: selecting
"5-star" still returned lower-rated hotels. Root cause was exactly what
the 2026-08-01 search-criteria audit had already flagged as an open
follow-up (see the updated note above) — Hotelbeds' quota had blocked
verifying it at the time, so the filter was never actually wired in,
just researched. Confirmed live: Hotelbeds' request body never included
any category filter at all, so it returned every star rating regardless
of the selection.

Two real fixes, not one, plus a belt-and-suspenders guarantee:
1. **Hotelbeds**: added `filter.minCategory`/`maxCategory` to the search
   request body. First attempt sent `"5EST"`-style strings (a guess from
   stale docs) and failed live with a 400 — `"Cannot deserialize value of
   type java.lang.Integer from String '5EST'"` — corrected to plain
   integers (1-5) after reading the real error, not the docs.
2. **SerpApi**: `hotel_class` was being sent as a single exact value
   (e.g. `"5"`), which the user's report clarified was the wrong
   semantics — a star-rating selection means "this or better", not "only
   this tier". Now sends every qualifying class as a comma-separated list
   (`accommodationStars: 4` → `hotel_class=4,5`).
3. **New guaranteed filter** (`filterByAccommodationStars` in
   `lib/search.ts`): drops any accommodation offer whose *known* star
   rating is below the requested minimum, regardless of whether a given
   provider's own filter actually worked — the same reasoning
   `filterByTransportModes` already applies to transport modes, since a
   provider-side filter is a request, not a guarantee. Offers with no
   parsed star rating are kept rather than dropped, since an unknown
   rating isn't evidence of failing the minimum.

Verified live via direct API calls (not just reading code): a 5★ search
returned 13 real Hotelbeds + 14 real SerpApi results, **27/27 confirmed
5★, zero below**. A 4★ search returned 103 four-star + 15 five-star + 1
unrated, zero below 4★ — confirming the "minimum, not exact tier"
semantics work correctly across both providers.

**Departure city defaults to the user's real location (2026-08-02).**
`lib/cityData.ts`'s `CITY_DATABASE` (132 cities) gained real `lat`/`lng`
city-center coordinates for every entry, plus `findNearestCity(lat, lng)`
(Haversine distance, picks the closest of the 132 — verified with a
standalone script: exact-coordinate match, a nearby-but-not-listed point
correctly resolving to the right city, and a far-away point still
resolving to *something* sane rather than crashing). New hook
`lib/useNearestCity.ts` wraps the browser's own Geolocation API and
resolves to a city name once (if) the user grants permission — denial,
no-support, or timeout (8s) all resolve to `null` silently rather than
erroring, since this is a convenience default, not a required step.
`app/page.tsx` applies it to `criteria.origin` only while that field still
has its untouched `DEFAULT_SEARCH.origin` value — if the user has already
typed a different origin by the time geolocation resolves (it can take a
few seconds), their edit wins and this is a no-op. No permission prompt is
forced; the browser's native geolocation dialog only appears because the
API was called, same as any other site asking for location.

**Ground transport for non-airport cities (2026-08-02).** User request: origin/
destination shouldn't be limited to the ~130 cities in `CITY_DATABASE` — typing
anywhere with no airport should still find a real way to get there (public
transport, private shuttles, trains, buses, taxis — "just like Rome2Rio does
it") and compare cost to pick the cheapest.

Researched real, self-serve multi-modal routing/fare APIs before writing any
code (same discipline as every other provider in this project) — reported
back to the user with findings before implementing:
- **Rome2Rio itself**: no longer self-serve. Its old free API dashboard
  (`free-dashboard.rome2rio.com`) doesn't resolve anymore and its docs pages
  404 — confirmed live 2026-08-02. Partner/sales-gated now, same dead end as
  Booking.com/Skyscanner/RateHawk.
- **Navitia.io**: genuine free self-serve signup, but public-transit-only and
  coverage is only as good as the open GTFS feeds available per region
  (strong in France, patchy elsewhere); fare data inconsistent per feed.
- **TripGo / Moovit / TransportAPI**: genuine multi-modal, but enterprise/
  sales-gated, not self-serve.
- **Google Routes/Directions API**: self-serve (Cloud Console key,
  pay-as-you-go with a free tier), but needs a billing account and transit
  fare data only exists for a small set of systems Google has fare
  partnerships with — not global coverage. User picked the free option
  instead (below) over setting up billing.
- **Conclusion, put to the user directly**: no self-serve API returns real
  ticket prices for arbitrary worldwide train/bus/shuttle routes — that data
  only exists behind sales-gated platforms. What *is* real and self-serve
  everywhere is distance/duration.

**What was built**, on the user's explicit choice of backend (no-billing
option over Google's paid one): `lib/providers/geocoding.ts` (`geocodePlace`,
OSM Nominatim search, no API key — just a compliant `User-Agent`, in-memory
cache) + `lib/providers/transport/ground-transport.ts` (`groundTransportProvider`,
registered in `transportProviders` alongside Duffel). For any origin/
destination: resolve coordinates (fast path checks `CITY_DATABASE`'s existing
lat/lng first, falls back to Nominatim for anything else) → real driving
distance/duration from OpenRouteService (`OPENROUTESERVICE_API_KEY`, free
self-serve signup at `openrouteservice.org/dev/#/signup` — **the user needs to
do this themselves**, account creation isn't something an agent does; until
then this provider reports "Missing OPENROUTESERVICE_API_KEY", same honest-
config-error pattern as every other unconfigured provider) → three
`TransportOffer`s (car/bus/train) with clearly-labeled estimated prices
derived from that real distance (indicative EU per-km rates, documented as
constants in the provider file) and, for bus/train, an estimated duration
(a multiplier on the one real number available — driving duration). The
estimate disclosure rides in `offer.outboundSummary`, which the existing
adapter (`lib/adapters/results.ts`) already threads into `providerNotes` —
no adapter changes needed, same freeform-notes pattern already used for
other providers, not a new fabrication mechanism. Ground routes beyond
1,500 km are skipped (not a realistic primary option vs. flying); a 404 from
OpenRouteService (no drivable route, e.g. separated by open water) quietly
returns no ground offers rather than erroring.

Verified live (2026-08-02): searching `Zakopane` (a real Polish town with no
airport, not in `CITY_DATABASE`) → Barcelona correctly produced
`duffel-flights: "No IATA code configured for Zakopane"` (honest, expected —
flights genuinely can't serve a place with no airport) alongside
`ground-transport: "Missing OPENROUTESERVICE_API_KEY"` (honest — key not yet
supplied) rather than a crash or silently-empty transport tab; confirmed
Nominatim itself resolves "Zakopane" to its real coordinates
(49.2969, 19.9505) via a direct call. **Not yet live-verified end-to-end**
(the actual OpenRouteService routing call + cost math) — blocked on the
user supplying a real `OPENROUTESERVICE_API_KEY`; do that and re-run this
same Zakopane→Barcelona search before considering this fully done.

**Getting Duffel working (2026-07-31) took three separate fixes**, worth knowing
about if another provider integration hits similar issues:
1. Token permissions — the original token lacked `air.offer_requests.create`;
   needed a token with that scope from the Duffel dashboard.
2. `lib/providers/locations.ts` had its own 3-city hardcoded lookup
   (`barcelona`/`berlin`/`szczecin` only) completely separate from the ~130-city
   `lib/cityData.ts` used by the search UI's autocomplete. Any origin/destination
   outside those 3 cities silently threw "No IATA code configured" and fell
   through to the demo provider even with a valid token. Fixed by deriving
   `resolveLocation`'s built-in table from `CITY_DATABASE` instead of a separate
   list — this generalizes to any real flight/hotel provider added later.
3. `lib/providers/flights/duffel.ts`'s passenger payload sent `{ type: "child", age }`
   for child travelers; Duffel's API rejects `type` and `age` together (422
   `one_of` validation error) — it wants `age` alone for children. Fixed to
   `{ age }`.

**Getting Hotelbeds working (2026-07-31):** user registered at
`developer.hotelbeds.com` and provided a real `HOTELBEDS_API_KEY` +
`HOTELBEDS_SECRET`, now in `.env.local`. Verified the signature auth
(`SHA-256(apiKey + secret + unixTimestamp)`) with a direct `curl` call
before touching the app — confirmed both `"PMI"` (Palma de Mallorca) and
`"BCN"` (Barcelona) work as Hotelbeds destination codes against their test
API, returning real hotels with real prices. Added `"BCN"` to
`TRIPWEAVER_LOCATION_HINTS_JSON` and confirmed the full pipeline end to end
in the browser (real hotel name/room/price rendering with a "Hotelbeds"
badge on the trip card, demo stays correctly suppressed). The search
adapter code itself needed no changes — it was correct on the first live
test.

**Real per-hotel photos (2026-07-31):** every accommodation card — from
every provider, not just Hotelbeds — was silently showing the exact same
shared destination photo. `lib/adapters/results.ts`'s `toAccommodationOption`
unconditionally stamped one shared `imageUrl` param onto every offer,
ignoring each offer's own `imageUrl` field entirely; only the (unusable)
Skyscanner adapter ever set that field. Hotelbeds' availability search
returns zero image data — real photos live in their separate Content API
(`hotel-content-api/1.0/hotels`), which supports a bulk `codes=` query
param, so `lib/providers/accommodations/hotelbeds.ts` now fetches images
for all returned hotels in one extra request per search (not one per
hotel), preferring a "GEN" (general/exterior) shot over room/bar/pool
close-ups. `toAccommodationOption` now prefers `offer.imageUrl` and only
falls back to the shared destination photo when a provider doesn't supply
one (currently: demo stays, Booking, Amadeus-adjacent — anything without
real per-listing images).

**Hotel details modal (2026-07-31→08-01):** Hotelbeds' Content API returns
up to 30 images per hotel, not just one — `rankImages`/`fetchHotelImages`
in `lib/providers/accommodations/hotelbeds.ts` already carried the full
ranked list through as `imageUrls` on the offer (added alongside the
per-hotel photo fix above), it just wasn't exposed in the UI. Added
`components/results/HotelDetailsModal.tsx`, wrapping each accommodation
card's hero photo with an always-visible affordance badge (hover-only
would exclude touch/keyboard users; the badge reads "+N photos" when a
gallery exists, "Details" otherwise). Opens a centered modal over a
blurred, dimmed full-page backdrop (`backdrop-blur-md` + body-scroll lock)
— rendered through a `createPortal` into `document.body` so it isn't
clipped by the card's own `overflow-hidden`. Left pane: the photo gallery
(prev/next arrows, counter, lazy-loaded thumbnail strip; only mounts the
current image ±1 neighbor so a 30-photo gallery doesn't fire 30 requests
on open). Right pane: the hotel's real details (room, board type,
cancellation policy, occupancy, total price) plus a small OpenStreetMap
embed (keyless, no API needed) centered on the hotel's real
latitude/longitude — Hotelbeds' availability search returns coordinates
directly, no extra request needed. Closes on Escape, backdrop click, or
the close button; providers without coordinates show a "location not
provided" placeholder instead of a fabricated map.

Wiring this up surfaced that `boardType` and `cancellationPolicy` on
`AccommodationOption` were never real data — `lib/adapters/results.ts`
hardcoded the same placeholder string for every offer regardless of
provider. Hotelbeds' rate object actually returns both (`boardName`,
`cancellationPolicies`), so `hotelbeds.ts` now derives real values
(e.g. "Free cancellation until 4 Sep 2026" or "Non-refundable — the full
amount is charged if you cancel") and `toAccommodationOption` prefers
them, falling back to the old placeholder only for providers that don't
supply this data yet.

**Trip Optimizer agent made authoritative (2026-08-01):** the agent
(`lib/optimizer/agent-review.ts`, real OpenRouter `gpt-4o-mini` call) was
genuinely running and returning a real, content-aware ranking — verified
live by logging its raw response — but had zero effect on anything the
user saw. Three separate, compounding bugs:
1. The order/scores shown everywhere came from a completely separate,
   local, deterministic function (`scoreTripOptions` in `lib/scoring.ts`)
   that has no AI involvement at all. The agent's `rankedTripIds` /
   `recommendedTripId` were computed and then discarded.
2. The initial per-search agent call (`lib/search.ts`) used a hardcoded
   `defaultWeights` constant instead of the user's actual slider weights,
   so its `appliedWeights` could never match the UI — which meant...
3. ...the "Trip Optimizer agent" status bar (`OptimizerAgentReview.tsx`)
   compared current weights against that mismatched `appliedWeights` and
   showed "Changes pending" from the moment of load, even with no
   interaction — and even after clicking "Review updated ranking", the
   refreshed ranking had nowhere to go: `onReview` was never wired to a
   parent handler.

Fixed by: `searchTrip()` now accepts the real weights and uses them for
the initial review (`app/api/trip-search/route.ts`, `lib/search.ts`);
`app/page.tsx` wires `onReview` to update `realResults.optimizerReview`;
a new `applyAgentRanking()` (`lib/scoring.ts`) reorders the locally-scored
trip list by the agent's `rankedTripIds`, pinning `recommendedTripId` to
the front — local scoring still produces the per-trip score/explanation
text, but *order* now comes from the agent. The "Best overall" tile/badge
was renamed **"AI recommended"** and now reflects `tripOptions[0]` post
-reorder instead of re-deriving a local top score. Also fixed:
`OptimizerAgentReview` never resynced its local `review` state when a
*new* search produced a new `initialReview` (same mounted component, no
remount) — added a `useEffect` keyed on the prop so a second search
doesn't keep showing the first search's stale headline. Verified live:
raising "Hotel quality" priority and clicking "Review updated ranking"
changed the top card to a different (pricier, higher-rated) hotel and
correctly dropped its "Cheapest" badge. `lib/optimizer/agent-review.ts`
also logs one line per call (`[optimizer-agent] ...`) so this stays
observable instead of silent.

**Second hotel source: Google Hotels via SerpApi (2026-08-01).** Went
looking for a second real accommodation source; most candidates turned
out to be dead ends on closer inspection, worth recording so this isn't
re-litigated:
- **RateHawk** — has a real self-serve "API Sandbox" program (Q4 2025+),
  but the *partner registration* that gates it requires a company name,
  legal entity, and tax ID (verified by reading their actual registration
  form) — not usable for an individual, same category of dead end as
  Booking.com/Skyscanner despite the "self-serve" marketing.
- **StayAPI** / **StayingAPI** — both genuinely individual-friendly at
  signup (just email/password, verified by reading their actual signup
  forms), but StayingAPI's free tier is a 300-credit *one-time* trial
  (90 days) and StayAPI's renewal terms couldn't be confirmed even from
  their own docs; both are OTA-price-intelligence products of uncertain
  ToS fit for a consumer-facing app.
- **Amadeus Hotel Search** — same self-service portal decommissioned
  July 17, 2026 (see the Amadeus flights entry above) — dead, despite
  SEO blog posts still claiming it has a free tier.
- **Aviationstack / FlightAware** (flights, not hotels, but checked in
  the same pass) — free tiers exist but these are schedule/tracking
  APIs with no fare data at all, wrong category entirely.

Landed on **SerpApi's Google Hotels API**: OAuth signup (GitHub/Google),
no business info, 250 searches/month free and *recurring* (not a trial).
`lib/providers/accommodations/serpapi-hotels.ts` — takes a free-text `q`
destination (no per-city code needed, unlike Hotelbeds), returns
`gps_coordinates` (feeds the hotel details modal's map directly) and a
real `images` array (feeds the photo gallery). Filters `properties` to
`type === "hotel"` (the free-text query also returns vacation rentals)
and drops any hotel with no `total_rate` at all — verified live that
Google Hotels genuinely omits pricing for some premium chains (Sofitel,
Radisson Blu, Hilton Diagonal Mar all came back rate-less for the same
Barcelona query) rather than always returning a number; showing those as
PLN 0 would've been a fabricated price. `boardType`/`cancellationPolicy`
aren't available from this source and fall back to the usual placeholder
text. Registered in `lib/providers/index.ts` alongside Hotelbeds — both
run on every hotel search and are combined/suppressed against demo stays
per the usual rule.

**Removed artificial per-provider result caps + infinite scroll (2026-08-01).**
Every adapter was silently truncating real API responses to a round
number — Duffel `.slice(0, 10)`, Hotelbeds `.slice(0, 12)`, SerpApi
`.slice(0, 12)` — that had nothing to do with what the APIs actually
return. Checked live: a single Duffel call returns **62** flight offers,
a single Hotelbeds call returns **187** hotels, both already bounded by
the provider's own per-call response size (no pagination needed to get
those numbers). Removed the caps in `lib/providers/flights/duffel.ts`,
`lib/providers/accommodations/hotelbeds.ts`, and
`lib/providers/accommodations/serpapi-hotels.ts` — those lists now
reflect real, uncapped provider responses (SerpApi still fetches only
one page per search, deliberately, to conserve its 250-search/month free
quota — see the comment in that adapter).

`combineOptions()` (`lib/search.ts`) is a genuine exception: it's a
transport × accommodation **cross-product**, so with real volumes
(62 × ~200) an uncapped combine would generate 10,000+ trip options —
not something any LLM prompt or browser tab should render. Raised its
per-side cap from 8×8=64 to `MAX_TRANSPORT_COMBOS`/`MAX_ACCOMMODATION_COMBOS`
= 24×24 = **576** (a ~9x increase), which is the *full, uncapped* set
handed to the Trip Optimizer agent — no further slicing happens before
`reviewTripOptionsWithAgent` sees it. Verified live: a real search
returned 576 trip options and the agent (`gpt-4o-mini`) still completed
in ~9s and returned a sensible top-10 `rankedTripIds` (the model chooses
how many to actually rank; nothing forces it to rank all 576, which is
the right behavior — a "top 10 picks" list is what a recommendation
should look like, not a full reordering of the tail).

Added `lib/useInfiniteReveal.ts` (IntersectionObserver-based, no new
dependency) + `components/results/InfiniteScrollFooter.tsx`, wired into
all three result lists (`ResultsTabs` complete-trips grid,
`AccommodationList`, `TransportOptionList`) — each now renders only the
first 20 items and reveals 20 more per scroll/click, instead of mounting
all 576/197/62 cards at once. The footer always includes a visible
"Show more" button alongside the scroll-triggered auto-load, both because
it's the more accessible path for keyboard users and because it's the
only path that's verifiable in this project's own automated browser
tooling — that tool's tab reports `document.visibilityState: "hidden"`
and `hasFocus: false`, which suspends `IntersectionObserver` callbacks
per Chromium's own behavior, so scroll-triggered loading could be
verified as *correctly wired* (sentinel positioned on-screen, observer
correctly created) but not *fired* in that harness. Works normally in a
real, focused, visible tab.

**Follow-up bug from the above (2026-08-01): Hotelbeds Content API silently
caps bulk image lookups at ~100 codes.** Uncapping Hotelbeds to 187 hotels
broke the per-hotel photo gallery for the ~87 hotels past that cutoff —
they silently fell back to the shared destination photo (multiple
different hotel cards showing the identical hero image), because
`fetchHotelImages`'s single `codes=` bulk call to
`hotel-content-api/1.0/hotels` returns real content for only the first
~100 codes with no error or truncation flag. Verified live: 187 codes in,
exactly 100 hotels' content back. Fixed by chunking the codes into
`CONTENT_API_BATCH_SIZE = 100`-sized batches and fetching them in
parallel (`Promise.all`), merging into one gallery map — verified live,
all 187 hotels now get a real, unique multi-photo gallery (previously 0
without images now, previously ~87 fell back to the shared photo). Costs
roughly one extra parallel Content API round-trip per search (search
latency went from ~9s to ~14s for a 187-hotel Barcelona search) — worth
watching if this becomes noticeable for very large destinations.

**All-hotels map view (2026-08-01).** Added a "Show all N on map" button
(top of the Accommodation tab, `components/results/AllHotelsMap.tsx`) that
plots every already-fetched accommodation option with real coordinates
(currently Hotelbeds + SerpApi, ~197/197 in a live Barcelona search) as
pins on one zoomable map — reuses the exact `results.accommodationOptions`
/`rejectedAccommodation` arrays already in state, no new API calls.
Clicking a pin shows that hotel's real details and photos (room, board,
cancellation, price, photo strip) in a side pane, using data already on
the option — nothing fetched on click either.

Added `leaflet` + `react-leaflet` (MIT, no API key, same OpenStreetMap
tile source already used for the single-hotel map) — the single-hotel
`<iframe>` embed approach couldn't do multiple markers or real zoom
controls. `components/results/HotelMapCanvas.tsx` is the actual Leaflet
canvas, dynamically imported with `ssr: false` (Leaflet touches `window`
at import time, which breaks Next.js SSR if imported directly). Markers
are plain CSS-styled `divIcon`s (`.hotel-marker` in `app/globals.css`)
rather than Leaflet's default marker images, which need a webpack
asset-path workaround in Next.js for no benefit here.

Layout is `lg:grid-cols-[1.5fr_1fr]` — verified live the rendered ratio
is exactly 1.5 (map pane 710px vs details pane 474px on a 1280px-wide
modal), i.e. the map genuinely gets 50% more space than the details pane,
as requested. **Real bug caught during verification:** the modal was
initially rendered inline (not portaled), so an ancestor's CSS put its
`fixed` positioning thousands of pixels down the page instead of pinned
to the viewport — fixed by portaling into `document.body` via
`createPortal`, the same pattern `HotelDetailsModal` already uses. Worth
remembering for any future full-screen overlay in this app: `position:
fixed` is only reliably viewport-relative from a portal at `document.body`.

Not implemented: marker clustering. With ~200 hotels concentrated in one
metro area, markers overlap heavily at the initial auto-fit zoom level —
functional (zooming in separates them, standard map UX) but visually
dense. Worth adding `leaflet.markercluster` if this becomes annoying in
practice.

**Optimizer agent model upgraded to gpt-5-mini + a real fixed-temperature
bug it surfaced (2026-08-01).** Compared OpenRouter's actual model
catalog/pricing (fetched live, not from memory) for this workload
(~90k input tokens per call — the full uncapped trip-options payload).
`openai/gpt-4o-mini` costs ~$0.015/search; `openai/gpt-5-mini` is only
marginally more (~$0.027/search) for a large jump in output quality —
compare gpt-4o-mini's one-line summaries against gpt-5-mini's actual
tradeoff reasoning with alternative picks and specific data-gap warnings
(see a real example logged during verification). `.env.local` and
`.env.example` now default to `openai/gpt-5-mini`.

Switching models surfaced a real bug: `lib/optimizer/agent-review.ts`
hardcoded `temperature: 0.2` on every OpenRouter call. Reasoning-tier
models (`gpt-5-mini`, the `o`-series, etc.) reject a custom temperature
entirely, and combined with `provider: { require_parameters: true }` —
which tells OpenRouter to only route to endpoints supporting every
parameter sent — that turned into a hard 404 with **no fallback route**,
silently degrading to the local heuristic reviewer instead of erroring
loudly. Verified live (direct curl against OpenRouter) that removing
`temperature` fixes it with no loss of behavior, since the strict JSON
schema already constrains the output shape regardless of temperature.
Removed the hardcoded value entirely rather than special-casing specific
models, so this doesn't recur the next time someone picks a different
model in `OPENROUTER_MODEL`.

**Trip card hero photo + known issue: Hotelbeds Content API test quota
exhausted (2026-08-01).** Added the accommodation's hero photo as a
background to each "Complete trips" card's price panel (`TripOptionCard.tsx`
`<aside>`), with a dark gradient overlay and white text for legibility —
same `option.accommodation.imageUrl` field the card already carried,
falls back to the shared destination photo (existing behavior) when a
provider has no photo for that listing.

While verifying this live, found every visible card was showing the
*same* fallback photo despite different hotel names — looked like a
rendering bug in the new code, but traced it to something else entirely:
**Hotelbeds' Content API test-account image quota is currently
exhausted** (`403 Forbidden: {"error":"Quota exceeded"}`, confirmed via
server logs). All 187/187 Hotelbeds hotels in a fresh search have no
`imageUrl` right now — this affects every place that shows Hotelbeds
photos (`AccommodationList`, `HotelDetailsModal`, `AllHotelsMap`, and now
this card), not something newly broken by this change. Confirmed the
card code itself is correct: SerpApi-sourced hotels (unaffected — their
images come from the search response directly, no separate Content API
call) still show real photos correctly. The previous fully-silent
per-batch catch in `fetchHotelImages` was masking this — it now logs the
actual error (`[hotelbeds-images] batch of N codes failed: ...`) instead
of swallowing it, so a real outage doesn't read as a UI bug next time.
Nothing to fix code-side; this resolves whenever Hotelbeds' test quota
resets (check the Hotelbeds developer portal for the reset window if it
doesn't clear on its own).

**Search criteria audit: 5 of 11 form fields had zero effect on results
(2026-08-01).** Same class of bug as the earlier disconnected optimizer
agent — `toTripSearchCriteria()` mapped these onto `TripSearchCriteria`,
but no provider ever read them back off the object. Verified live
(not just by reading code) for each:

- **Accommodation standard** (Any/Apartment/3★/4★/5★) — requesting
  `accommodationStars: 5` returned 198 hotels spanning all of 1★-5★.
  **Fixed**: SerpApi has a real, documented `hotel_class` param —
  verified live, requesting 5★ now returns only genuine 5★ results.
  Hotelbeds is documented to support `filter.minCategory`/`maxCategory`
  too, but **couldn't verify live** — see the quota note above, which
  turned out to affect Hotelbeds' core search endpoint too, not just
  images. Follow-up once quota resets. **Fully fixed 2026-08-02** — see
  the dated note below: Hotelbeds' quota reset, the filter was actually
  wired in and verified, and both providers plus a new guaranteed
  safety-net filter now correctly treat the selection as a minimum, not
  an exact tier.
- **Preferred transport** (Flight/Train/Bus/Car/Ferry/Transfer) —
  requesting `transportModes: ["train"]` still returned 62 Duffel
  flights, 0 trains. **Fixed**: `lib/search.ts` now filters
  `transportOptions` by `offer.mode ∈ transportModes`. Honest limit:
  Duffel is flights-only and there's no real train/bus/car/ferry
  provider in this codebase — selecting only those modes now correctly
  returns 0 real results (verified live) rather than silently
  substituting flights, but it can't manufacture data that doesn't
  exist. (At the time this was written, demo transport's `mode: "bus"`
  route added a wrinkle here — see the 2026-08-02 dated note above:
  the demo transport/accommodation providers were removed entirely, so
  a train/bus-only search now always returns a genuinely empty state,
  not just when a real provider happens to succeed.)
- **Budget** (min/max) — never sent to any provider at all; UI/display
  only. **Fixed**: since budget describes the *whole trip*, not one
  category, enforcing it against a single provider's own price filter
  would be wrong (e.g. capping the hotel alone to the full trip budget).
  Instead `lib/search.ts` filters the *combined* `tripOptions` totals
  against `budget`/`budgetMin` after combining. Verified live: 264
  unfiltered trips → 5 at `budget=6000`, all genuinely ≤6000.
  Surfaced a real side effect: `DEFAULT_SEARCH`'s budget (8000 PLN,
  `lib/defaults.ts`) was never realistic for the default
  route/family/4★ combo — real converted totals run 8,095-15,015 PLN —
  it just never mattered before because budget did nothing. Raised the
  default to 12,000 PLN so the out-of-the-box demo search doesn't return
  zero results.
- **Checked luggage** — was stamping `luggageIncluded` to match the
  toggle on *every* offer regardless of the fare's real policy, rather
  than reflecting reality. **Fixed**: Duffel returns real per-passenger
  baggage data (`slices[].segments[].passengers[].baggages`, with
  `type: "checked"|"carry_on"`) — `duffel.ts` now reads that instead of
  fabricating it. Verified against raw Duffel data directly (not just
  the app's output). The luggage-fee *estimate* in
  `lib/adapters/results.ts` now only applies when the traveler said they
  need checked luggage AND the real fare doesn't include it — previously
  it charged the fee any time `luggageIncluded` was falsy, regardless of
  whether the toggle even mattered.
- **Optimization priorities** (Cheapest/Shortest/Fewest transfers/Lowest
  carbon/Hotel quality/All-inclusive checkboxes) — never left the search
  form component; not even passed into `toTripSearchCriteria`. **Fixed**:
  added `weightsFromPreferences()` (`lib/adapters/criteria.ts`), mapping
  each selected preference onto the matching `OptimizerWeights` dimension
  (allInclusive has no matching axis — it's a board-type preference, not
  a ranking one — and stays unmapped). `app/page.tsx` now sets this as
  the OptimizerPanel's starting weights at search time instead of always
  resetting to the same fixed default. Verified live: selecting only
  "Lowest carbon footprint" produced sliders
  `{price:10, travelTime:10, convenience:10, hotelQuality:10, sustainability:40}`
  instead of the old fixed 38/22/18/14/8 regardless of checkbox state.
- **Flexible dates** — still not wired to any real provider. Neither
  Duffel nor Hotelbeds/SerpApi support a single-call "nearby dates"
  query; doing this for real means multiple date-shifted requests per
  search (extra latency/API-quota cost per search). Not implemented —
  scoped out as a larger follow-up, not a quick fix like the others here.

**Demo fallback suppression (2026-07-31):** `lib/search.ts` now suppresses a
category's demo provider whenever any real provider for that category
returned results, instead of always blending both. If every real provider for
a category fails or isn't configured, demo results still show (so the app
stays demoable). Flights are pure-real now that Duffel works for any of the
~130 cities in `lib/cityData.ts`; hotels are pure-real for Barcelona now that
Hotelbeds is verified working — other destinations still fall back to demo
stays until they get a `hotelbedsDestinationCode` in `TRIPWEAVER_LOCATION_HINTS_JSON`.
**Superseded 2026-08-02** — see the dated note near the top of this file:
the demo flights/hotels providers this note describes were removed
entirely, so this suppression logic no longer exists or applies.

**Results page redesign (2026-07-31):** the results view was restructured
end to end — see "What's implemented" below for the current shape. Highlights:
`TripSummaryRail` (the old single-trip right-side detail panel) was deleted
entirely; that level of detail already existed per-card via each trip card's
"Show details" toggle, which now default to **collapsed** (not expanded) so
the results list stays scannable. `OptimizerPanel` moved from a full-width
block above the results into a sticky 400px left sidebar. The "Trip
comparison results" header lost its redundant subtitle/pill/DATES-BUDGET
card (all duplicated info already shown in the compact summary bar above it)
and was renamed to just "Results". The destination background image system
was replaced (see the Background note below).

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
compare-up-to-3, save-to-localStorage (`lib/storage.ts`). "Complete trips"
isn't self-organized-combos-only — within-budget package holidays are
merged in too (`kind: "package"` trip options, see the 2026-08-02 dated
note), so a package can win "AI recommended"/"Cheapest"/"Fastest" the same
as a flight+hotel combo. The Packages tab itself still lists every real
result found regardless of budget.

**Optimizer**: `OptimizerPanel` (weight sliders, comparison-scenario cards,
score explanation) lives as a sticky **left sidebar** (`lg:grid-cols-[400px_minmax(0,1fr)]`
in `app/page.tsx`, `lg:sticky lg:top-6` on the panel) that stays in view while
the results list scrolls beside it — its internal layout was flattened to a
single column since it now always renders in a fixed 400px rail, not a
full-width block. Re-scoring happens client-side instantly (`lib/scoring.ts`).
The "Trip Optimizer agent" AI review (`components/optimizer/OptimizerAgentReview.tsx`)
sits at the top of the right/main column, collapsed to a one-line bar by
default (icon + truncated headline + status pill + "Review updated ranking"
button when changes are pending) — click the row to expand the full
narrative. It calls the real OpenRouter-backed API on demand and, as of
2026-08-01, **its ranking is authoritative**: `applyAgentRanking()`
(`lib/scoring.ts`) reorders the displayed trip list by the agent's
response, and the "AI recommended" tile/badge reflects its actual top
pick — see the dated note below for how this used to be pure decoration.

**Search → results flow**: after a successful search, the hero + wizard
collapse into a compact summary bar (`SearchSummaryBar` in `app/page.tsx`)
with route/dates/travelers/budget + an "Edit search" button that re-expands
the wizard, pre-filled. The "Weaving transport, stays and packages" loading
state is a fixed, blurred full-viewport overlay modal (not inline content) so
the search form stays visible-but-blocked behind it while a search runs.

**Background**: one shared `position: fixed` image+gradient layer rendered
once at the top of `<main>` (`app/page.tsx`) — covers the hero, the compact
summary bar, and the results section with a single continuous, non-scrolling
backdrop (previously three separate `absolute`-positioned images per section,
which produced a visible seam and scrolled away with their section).
`lib/useDestinationImages.ts` resolves the typed destination to a Wikipedia
article (keyless `opensearch` + `media-list` REST endpoints, CORS-enabled,
no API key) and rotates through up to 5 of that article's real photos
(filtered to exclude flags/maps/logos/coats-of-arms) every 9s with a
cross-fade, so the backdrop is an actual, recognizable photo of the
destination instead of a generic/random stock image. Falls back to
generic scenic Unsplash photos if a destination has no Wikipedia match or
the fetch fails.

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

- **Package holidays**: real (Apify DACH scraper) as of 2026-08-01, but only
  for German-region departure airports, and it's an unofficial scraper with
  real ToS risk — see the dated note and provider table above. A second,
  official source (TUI) is pending the user's own account approval; see
  "Where to pick up work" below.
- **Hotelbeds destination coverage**: only Barcelona has a
  `hotelbedsDestinationCode` in `TRIPWEAVER_LOCATION_HINTS_JSON` right now
  (`"BCN"`). Every other destination relies on SerpApi's free-text coverage
  instead until someone looks up and adds its Hotelbeds code — Hotelbeds
  codes are their own codification, not IATA, so they can't be derived from
  `lib/cityData.ts` the way flight IATA codes were.
- **Amadeus, Booking.com, Skyscanner**: dead ends for an individual/non-business
  user right now (see provider table). Don't spend time on these unless that
  changes.
- **Ground transport pricing is a heuristic estimate, not a real fare** —
  see the 2026-08-02 dated note above. No self-serve API exists for real
  worldwide point-to-point train/bus/shuttle ticket prices; only distance/
  duration are real (OpenRouteService). Also **not yet live-verified**
  end-to-end — needs the user's own `OPENROUTESERVICE_API_KEY`.
- **No tests.** No unit tests, no e2e tests, no CI. Everything has been
  verified by manual browser testing during development.
- **No mobile-specific testing.** Responsive classes exist throughout but the
  mobile layout hasn't been explicitly click-tested in this project.
- **npm audit**: 12 vulnerabilities (mostly transitive deps), not addressed.
  Also one `EBADENGINE` warning (`eslint-visitor-keys` wants a newer Node).
- **`budgetMin`** now flows through to the real search and is enforced
  against the combined trip total (2026-08-01, see the search-criteria audit
  note above) — fixed, no longer a gap. Still not shown anywhere outside the
  Step 3 slider (review step, collapsed summary bar, results) if that's ever
  wanted.
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

0. **Ground transport needs a real `OPENROUTESERVICE_API_KEY`** — sign up free
   at `openrouteservice.org/dev/#/signup` (account creation isn't something
   an agent does), add it to `.env.local`, then re-run a search for a place
   outside `CITY_DATABASE` (e.g. origin "Zakopane") to confirm real car/bus/
   train estimates appear instead of the current "Missing
   OPENROUTESERVICE_API_KEY" status. See the 2026-08-02 dated note above.
1. **Hotelbeds destination coverage** — Hotelbeds is verified working, but
   only Barcelona has a `hotelbedsDestinationCode` hint. Look up and add
   codes for other frequently-searched cities in
   `TRIPWEAVER_LOCATION_HINTS_JSON` so they get real Hotelbeds results too,
   on top of what SerpApi already covers for any destination.
2. **Package holidays** — three candidates researched live 2026-08-01.
   **Candidate B (Apify) is now implemented and verified working
   end-to-end** — see below. A and C remain not-implemented, blocked on
   the user's own account/business-contact steps (account creation isn't
   something an agent does). Full detail:

   **What "package holiday" means in this codebase**: not just a flight +
   hotel search combined client-side (that's what `combineOptions` in
   `lib/search.ts` already does for the "Complete trips" tab, using
   Duffel + Hotelbeds/SerpApi). `PackageHoliday` (`lib/types.ts`) models a
   genuine **tour-operator bundle**: one seller, one combined
   `cancellationPolicy`, `tourOperator` name, `airportTransferIncluded`,
   `childDiscount`. A real fix needs a provider that actually sells bundles
   under one set of terms, not two services glued together.

   **Candidate A — TUI Developer Portal** (`developer.tui`): official tour
   operator, exact semantic match via their "Meta Partner Package Live
   Search" API (real-time package pricing/availability) — but currently
   **blocked by a bug on TUI's own signup form**, not by anything on our
   end. **Status as of 2026-08-02**: user registered at
   `signup.developer.tui`, requested the `search-holiday-offers` API
   product (the dropdown's internal name for what the catalog page calls
   "Meta Partner Package Live Search" — no business/tax ID was required at
   signup, just name/email/company). Submitting the form does nothing
   visible — traced this to a real bug, confirmed independently twice
   (once via the user's own DevTools, once via Claude driving the user's
   real Chrome through the `claude-in-chrome` MCP surface, both giving
   identical results): the form's own background call,
   `POST https://prod.api.tui/tuiapis/v2/access-requests`, returns
   **401** (`WWW-Authenticate: Bearer realm="null", error="invalid_token",
   error_description="oauth.v2.InvalidAccessToken..."`) — the signup page
   isn't attaching a valid token to its own submission request, and shows
   no error to the user when it fails, which is why it looked like
   "nothing happens" rather than an obvious error. Reported to
   `apiplatform@tui.com` on 2026-08-02 with the exact repro. **Nothing to
   do here until TUI responds** — this is entirely on their side to fix
   before the access request can even be submitted, let alone approved.
   Once (if) it goes through: build `lib/providers/packages/tui.ts`
   following the `hotelbedsAccommodationProvider` pattern
   (`TravelProvider<PackageHoliday-shaped offer>`), register in
   `packageProviders` (`lib/providers/index.ts`) alongside
   `apifyDachPackagesProvider`, map response fields onto `PackageHoliday`.
   Verify field-by-field against a live call before trusting the docs,
   same discipline as every other provider in this project.

   **Candidate B — Apify "DACH Package Holiday Price API"** — **real,
   wired, verified working end-to-end (2026-08-01)**.
   `lib/providers/packages/apify-dach-packages.ts`, needs `APIFY_API_TOKEN`.
   Real live bundled prices from 5 actual German tour operators (TUI
   Germany, DERTOUR, weg.de, ab-in-den-urlaub.de, alltours), GIATA-matched
   hotels, real photos, real per-operator savings badges — matches exactly
   what the project's old dead reference file
   (`lib/providers/packages/mockGermanTourOperatorsProvider.ts`) was
   clearly modeled after. Pricing: pay-per-event, ~$0.70/1,000 package
   offers — `lib/search.ts` only calls package providers when
   `criteria.packageHolidays !== false`, since (unlike flights/hotels)
   every search here costs real money. **Real caveat, still true**: this
   is an *unofficial third-party scraper* of those five operators' own
   websites, not a licensed feed — ToS-violation risk against those sites,
   and fragile (one live run saw `alltours` fail with a 60s Playwright
   timeout and `tui` fail with an HTTP 500 from the upstream site — both
   real, both expected occasionally with this kind of integration).

   **Two real findings from building this, worth knowing before touching
   this provider again**:
   1. The actor's dataset mixes real `recordType:"offer"` rows with a
      `recordType:"run_diagnostic"` summary row (source health/error
      info, no real price data) — the adapter filters to `"offer"` only.
      Skipping this filter produces a fake-looking "Unknown operator /
      Package stay / [currency] 0" entry; caught during live verification,
      not by reading the docs.
   2. **These operators are DACH-market (Germany/Austria/Switzerland)
      tour operators — real results only come back for German-region
      departure airports** (FRA, MUC, DUS, CGN, etc.), not this app's
      default Szczecin origin. Live-tested both: Szczecin (SZZ) → 0 real
      offers (tui down, dertour discarded all 20 offers because it
      substituted CGN/ZRH for the unsupported SZZ request, weg/aidu
      returned nothing for that airport); Frankfurt (FRA) → 60 real
      offers across 3 of 5 operators. This is inherent to the data
      source, not a bug — worth surfacing in the UI at some point (e.g.
      a note when packages are requested for a non-DACH origin) but not
      done yet.
   3. `cancellation` and `flight.baggage` were `null` across every real
      record seen from every operator — this actor doesn't reliably
      surface either, so `cancellationPolicy`/`luggageIncluded` fall back
      honestly (the same "Confirm cancellation terms with the provider"
      pattern already used for hotels, and `undefined`→`false` rather
      than guessing) instead of fabricating them. `childDiscount` is
      always `0` for the same reason — the source prices the whole family
      into one total without breaking out a child-specific figure.

   **Candidate C — Duffel Stays** (`duffel.com/stays`): *not a real
   package-holiday fix even if unlocked* — it's two separate services
   (flights, stays) sold independently, same shape as what Hotelbeds/
   SerpApi already provide. Would extend the **Accommodation tab /
   Complete trips combos** (a third real hotel source, no destination-code
   limitation like Hotelbeds), not the Packages tab — don't register it in
   `packageProviders`, register it alongside `hotelbedsAccommodationProvider`
   in `accommodationProviders` instead. **Corrected 2026-08-01**: their
   marketing implies "self-serve from the first booking," but verified
   live against the existing `DUFFEL_ACCESS_TOKEN` — `POST
   /stays/search` returns `403: "This feature is not enabled for your
   account. Please contact sales."` So this needs a Duffel sales contact
   to enable, same business-gate pattern as RateHawk, not the zero-signup
   win it looked like. Lower priority than A/B given that.

   **Status as of 2026-08-01**: B (Apify) done and live. A (TUI) —
   registration was started by the user in parallel; once/if approved for
   the Meta Partner Package Live Search API specifically, build
   `lib/providers/packages/tui.ts` the same way (`TravelProvider`,
   register in `packageProviders` alongside `apifyDachPackagesProvider`,
   verify every field live before trusting the docs) — a second real
   package source would be a genuine upgrade over the Apify scraper's ToS
   risk, not a duplicate. C (Duffel Stays) needs a sales contact first,
   remains the lowest priority — and remember it's an *accommodation*
   source, not a packages one, if it ever gets unlocked.
3. **Testing** — add a test runner and at least cover `lib/adapters/*` and
   `lib/scoring.ts` (pure functions, easy to unit test) plus a basic e2e smoke
   test of the search flow.
4. **Mobile QA pass** — click through the full flow at mobile viewport widths,
   fix what's broken.
5. **Dependency hygiene** — `npm audit fix`, address the Node engine warning.
