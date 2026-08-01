# TripWeaver — Project Status

Last updated: 2026-08-01. This file is meant to give a fresh chat session (or a
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
| Flights | **Duffel** | **Real, wired, verified working end-to-end** (2026-07-31). Token in `.env.local` now has the `air.offer_requests.create` permission. Returns real offers alongside the demo provider. |
| Flights | Amadeus | Not usable. Self-serve sandbox was **decommissioned July 17, 2026**; now enterprise-sales-only. Code exists (`lib/providers/flights/amadeus.ts`) but will always report "Missing AMADEUS_CLIENT_ID" without an enterprise deal. |
| Flights | **TripWeaver Demo Transport** | Fallback, always runs, always succeeds. 4 synthetic routes (direct flight, connecting flight, train+flight via Berlin, overnight bus+flight), priced off traveler count. `lib/providers/transport/demoFlights.ts`. |
| Hotels | Booking.com Demand API | Not usable. Partner-gated, no credentials, and no accessible self-serve path found. Code exists but needs `bookingCityId` per destination via `TRIPWEAVER_LOCATION_HINTS_JSON` even if credentialed. |
| Hotels | Skyscanner Hotels | Not usable. Same partner-gating issue as Booking.com. |
| Hotels | **Hotelbeds / HBX Group API Suite** | **Real, wired, verified working end-to-end** (2026-07-31). `lib/providers/accommodations/hotelbeds.ts`, registered in `lib/providers/index.ts`. `HOTELBEDS_API_KEY` + `HOTELBEDS_SECRET` are set in `.env.local` (signature auth: SHA-256 of `apiKey+secret+unixTimestamp`, sent as `Api-key`/`X-Signature` headers) and `TRIPWEAVER_LOCATION_HINTS_JSON` has a `hotelbedsDestinationCode` for Barcelona (`"BCN"` — confirmed via a live call; Hotelbeds destination codes are their own codification, not IATA, so other cities need their own code looked up before they'll return results). Returns real hotels (name, star category, room type, price, and a real per-hotel photo via a bulk Content API call — see the "Real per-hotel photos" note below) alongside/suppressing the demo provider per the usual rule. |
| Hotels | **Google Hotels (SerpApi)** | **Real, wired, verified working end-to-end** (2026-08-01). `lib/providers/accommodations/serpapi-hotels.ts`, needs `SERPAPI_KEY`. Free tier: 250 searches/month, recurring. Not a licensed wholesaler feed — it's SerpApi's structured JSON of Google Hotels' own search results (comparison-only, no booking capability; `bookingUrl` points at the hotel's own site/listing, not an affiliate booking link). Takes a free-text destination (`q`) instead of a per-city code, so — unlike Hotelbeds — it isn't limited to destinations with a hint configured. Some premium chain hotels (seen live: Sofitel, Radisson Blu, Hilton) come back from Google with no rate at all for a given query; these are filtered out rather than shown with a fabricated PLN 0 price. |
| Hotels | **TripWeaver Demo Stays** | Fallback, always runs, always succeeds. 5 synthetic hotels across star ratings. `lib/providers/accommodations/demoStays.ts`. |
| Packages | **DACH Package Holidays (Apify)** | **Real, wired, verified working end-to-end** (2026-08-01). `lib/providers/packages/apify-dach-packages.ts`, needs `APIFY_API_TOKEN`. Real bundled prices from TUI/DERTOUR/weg.de/ab-in-den-urlaub.de/alltours — but only for German-region departure airports (see the dated note below); Szczecin returns 0. Unofficial third-party scraper, not a licensed feed — see the ToS caveat in the dated note. No demo fallback still — if this provider fails/returns nothing, the tab is honestly empty rather than showing synthetic data. |
| Optimizer agent | **OpenRouter** | Real, wired, verified working end-to-end (`gpt-5-mini` via `OPENROUTER_API_KEY`, configurable via `OPENROUTER_MODEL`). Falls back to a local heuristic scorer if the key is missing or the call fails. As of 2026-08-01 its ranking is authoritative over the displayed trip order (previously computed but discarded — see the dated note below). `lib/optimizer/agent-review.ts`, UI in `components/optimizer/OptimizerAgentReview.tsx`. |

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
  images. Follow-up once quota resets.
- **Preferred transport** (Flight/Train/Bus/Car/Ferry/Transfer) —
  requesting `transportModes: ["train"]` still returned 62 Duffel
  flights, 0 trains. **Fixed**: `lib/search.ts` now filters
  `transportOptions` by `offer.mode ∈ transportModes`. Honest limit:
  Duffel is flights-only and there's no real train/bus/car/ferry
  provider in this codebase — selecting only those modes now correctly
  returns 0 real results (verified live) rather than silently
  substituting flights, but it can't manufacture data that doesn't
  exist. One interaction worth knowing: demo transport (which does have
  a `mode: "bus"` route) stays suppressed whenever *any* real transport
  provider succeeds, even for an unrelated mode — so a train/bus-only
  search when Duffel is working returns a genuinely empty state rather
  than falling back to a demo bus estimate. Not changed; a deliberate,
  separate design choice from `offersExcludingSuppressedDemo`, flagged
  here in case it's worth revisiting later.
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
compare-up-to-3, save-to-localStorage (`lib/storage.ts`).

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
  (`"BCN"`). Every other destination falls back to demo stays until someone
  looks up and adds its code — Hotelbeds codes are their own codification,
  not IATA, so they can't be derived from `lib/cityData.ts` the way flight
  IATA codes were.
- **Amadeus, Booking.com, Skyscanner**: dead ends for an individual/non-business
  user right now (see provider table). Don't spend time on these unless that
  changes.
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

1. **Hotelbeds destination coverage** — Hotelbeds is verified working, but
   only Barcelona has a `hotelbedsDestinationCode` hint. Look up and add
   codes for other frequently-searched cities in
   `TRIPWEAVER_LOCATION_HINTS_JSON` so they get real hotels too instead of
   falling back to demo stays.
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

   **Candidate A — TUI Developer Portal** (`developer.tui`),
   *recommended first attempt*: official tour operator, exact semantic
   match via their "Meta Partner Package Live Search" API (real-time
   package pricing/availability). Access: register at
   `signup.developer.tui` (email/username, no business/tax ID seen in the
   registration flow) — but TUI's partner management team then manually
   validates and approves the *specific API* you request; timeline/odds
   unknown, similar to the RateHawk situation from the hotels search
   earlier this session. Ask for the Meta Partner Package Live Search API
   specifically, not just a general account. Once approved: build
   `lib/providers/packages/tui.ts` following the `hotelbedsAccommodationProvider`
   pattern (`TravelProvider<PackageHoliday-shaped offer>`), register in
   `packageProviders` (`lib/providers/index.ts`, currently `[]`), map
   response fields onto `PackageHoliday`. Verify field-by-field against a
   live call before trusting the docs, same discipline as every other
   provider in this project.

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
