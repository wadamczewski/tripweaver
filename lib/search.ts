import { accommodationProviders, packageProviders, transportProviders } from "./providers";
import { ProviderConfigError } from "./providers/http";
import { convertMoney } from "./providers/fx";
import type {
  AccommodationOffer,
  PackageSearchResults,
  ProviderStatus,
  TransportOffer,
  TravelProvider,
  TripOption,
  TripSearchCoreResults,
  TripSearchCriteria,
} from "./trip/types";

// The only real transport provider (Duffel) is flights-only — there's no
// real train/bus/car/ferry data behind this app. Filtering here means an
// unchecked "Flight" mode honestly excludes flights (previously it had no
// effect at all — Duffel ran regardless of what was selected) rather than
// silently returning results the user excluded; it can't manufacture real
// non-flight results that don't exist.
function filterByTransportModes(offers: TransportOffer[], modes: TripSearchCriteria["transportModes"]) {
  if (!modes || modes.length === 0) return offers;
  return offers.filter((offer) => modes.includes(offer.mode));
}

// accommodationStars is a minimum ("4-star" means "4-star or better"), not
// an exact match — enforced here as a guarantee regardless of whether a
// given provider's own category filter actually worked. Real bug found
// live: Hotelbeds never read accommodationStars at all (no filter sent),
// so a "5-star" search still returned every category; SerpApi's hotel_class
// param was being sent as a single exact value instead of a minimum range.
// Both are now fixed at the provider level too (see hotelbeds.ts and
// serpapi-hotels.ts), but this stays as the actual guarantee, the same way
// filterByTransportModes doesn't just trust Duffel to only return flights.
// Offers with no parsed star rating are kept rather than dropped — an
// unknown rating isn't evidence it fails the minimum, and hiding them would
// lose real results just because a provider's category text didn't match
// the parser.
function filterByAccommodationStars(offers: AccommodationOffer[], minStars: TripSearchCriteria["accommodationStars"]) {
  if (!minStars) return offers;
  return offers.filter((offer) => offer.stars === undefined || offer.stars >= minStars);
}

// budget/budgetMin describe the whole trip, not one category — enforced
// here against the combined transport+accommodation total, not pushed into
// any single provider's own price filter (which would incorrectly cap, say,
// the hotel alone to the full trip budget).
function filterByBudget(trips: TripOption[], criteria: TripSearchCriteria) {
  if (criteria.budget === undefined && criteria.budgetMin === undefined) return trips;

  return trips.filter((trip) => {
    if (criteria.budget !== undefined && trip.totalPrice.amount > criteria.budget) return false;
    if (criteria.budgetMin !== undefined && trip.totalPrice.amount < criteria.budgetMin) return false;
    return true;
  });
}

async function timed<T>(label: string, promise: Promise<T>): Promise<T> {
  const start = Date.now();
  const result = await promise;
  console.log(`[search-timing] ${label}: ${Date.now() - start}ms`);
  return result;
}

async function searchProvider<TOffer>(provider: TravelProvider<TOffer>, criteria: TripSearchCriteria) {
  try {
    const offers = await provider.search(criteria);
    return {
      offers,
      status: {
        providerId: provider.id,
        ok: true,
        message: `${offers.length} result${offers.length === 1 ? "" : "s"}`,
      } satisfies ProviderStatus,
    };
  } catch (error) {
    const isConfig = error instanceof ProviderConfigError;
    return {
      offers: [],
      status: {
        providerId: provider.id,
        ok: false,
        message: isConfig ? error.message : error instanceof Error ? error.message : "Provider search failed",
      } satisfies ProviderStatus,
    };
  }
}

// Trip combos are a cross-product (transports × accommodations), so unlike
// the raw provider lists this genuinely can't stay uncapped — with real
// volumes (seen live: 62-1688 Duffel flights × ~185-200 hotels across
// providers) an uncapped cross-product would be 10,000+ combos, well past
// what's sane to hand the optimizer agent in one prompt. 24 of each side
// (576 combos max) is a ~9x increase over the old 8×8=64 cap while keeping
// the agent's prompt comfortably inside a small model's context window.
const MAX_TRANSPORT_COMBOS = 24;
const MAX_ACCOMMODATION_COMBOS = 24;

// Evenly spreads `count` picks across a price-sorted list instead of
// always taking the cheapest N. A pure cheapest-N slice biases the whole
// cross-product toward the low end of the price range — verified live: a
// real Barcelona search returned 1688 flights (cheapest ~180 PLN) and 185
// hotels (cheapest ~530 PLN); the old cheapest-24-of-each slice topped out
// at 1420 PLN combined, so a search with even a modest budgetMin (e.g.
// 4000 PLN) rejected every one of the 576 combos as "too cheap" — not
// because no real combo in range existed (the full 1688×185 dataset
// almost certainly has some), but because none of the candidates the
// cross-product ever considered were priced anywhere near what was asked
// for. Stratified sampling instead spans from the cheapest real option up
// toward the most expensive one on each side, so the resulting combos
// cover a realistic spread of the whole price range, not just its floor.
function stratifiedSample<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  if (count <= 1) return items.slice(0, count);

  const lastIndex = items.length - 1;
  const picks: T[] = [];

  for (let i = 0; i < count; i++) {
    picks.push(items[Math.round((i * lastIndex) / (count - 1))]);
  }

  return picks;
}

function combineOptions(transports: TransportOffer[], accommodations: AccommodationOffer[], criteria: TripSearchCriteria) {
  const currency = criteria.currency;

  return stratifiedSample(transports, MAX_TRANSPORT_COMBOS).flatMap((transport) =>
    stratifiedSample(accommodations, MAX_ACCOMMODATION_COMBOS).map((accommodation) => ({
      id: `${transport.id}__${accommodation.id}`,
      transport,
      accommodation,
      totalPrice: {
        amount: Number(
          (convertMoney(transport.totalPrice, currency).amount + convertMoney(accommodation.totalPrice, currency).amount).toFixed(2),
        ),
        currency,
      },
    })),
  ) satisfies TripOption[];
}

// The fast half of a search — transport, accommodation, and their
// cross-product. Deliberately excludes packages (can take 30-140+ seconds,
// see searchPackageHolidays below) and the Trip Optimizer agent review
// (20-60+ seconds, see lib/optimizer/agent-review.ts) so the frontend can
// show real results within a couple of seconds instead of blocking on
// whichever of those is slowest. Both are fetched separately and merged
// into the UI once they resolve.
export async function searchTripCore(criteria: TripSearchCriteria): Promise<TripSearchCoreResults> {
  const searchStart = Date.now();

  const [transportSearches, accommodationSearches] = await Promise.all([
    timed("transport", Promise.all(transportProviders.map((provider) => searchProvider(provider, criteria)))),
    timed("accommodation", Promise.all(accommodationProviders.map((provider) => searchProvider(provider, criteria)))),
  ]);

  const transportOptions = filterByTransportModes(
    transportSearches.flatMap((result) => result.offers),
    criteria.transportModes,
  ).sort((a, b) => a.totalPrice.amount - b.totalPrice.amount);
  const accommodationOptions = filterByAccommodationStars(
    accommodationSearches.flatMap((result) => result.offers),
    criteria.accommodationStars,
  ).sort((a, b) => a.totalPrice.amount - b.totalPrice.amount);
  const tripOptions = filterByBudget(
    combineOptions(transportOptions, accommodationOptions, criteria),
    criteria,
  ).sort((a, b) => a.totalPrice.amount - b.totalPrice.amount);

  console.log(`[search-timing] core total: ${Date.now() - searchStart}ms (${tripOptions.length} trip combos)`);

  return {
    transportOptions,
    accommodationOptions,
    tripOptions,
    providerStatuses: [...transportSearches, ...accommodationSearches].map((result) => result.status),
  };
}

// Package providers are billed per search (Apify's pay-per-event pricing)
// and query several real German tour-operator sites — unlike flights/hotels,
// only call them when the user actually wants packages, not on every
// search regardless of the toggle.
export async function searchPackageHolidays(criteria: TripSearchCriteria): Promise<PackageSearchResults> {
  if (criteria.packageHolidays === false) {
    return { packageOptions: [], providerStatuses: [] };
  }

  const packageSearches = await timed(
    "packages",
    Promise.all(packageProviders.map((provider) => searchProvider(provider, criteria))),
  );

  const packageOptions = packageSearches
    .flatMap((result) => result.offers)
    .sort((a, b) => a.totalPrice.amount - b.totalPrice.amount);

  return {
    packageOptions,
    providerStatuses: packageSearches.map((result) => result.status),
  };
}
