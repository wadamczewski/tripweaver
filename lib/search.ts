import { accommodationProviders, packageProviders, transportProviders } from "./providers";
import { ProviderConfigError } from "./providers/http";
import { convertMoney } from "./providers/fx";
import { reviewTripOptionsWithAgent, defaultWeights } from "./optimizer/agent-review";
import type {
  AccommodationOffer,
  OptimizerWeights,
  ProviderStatus,
  TransportOffer,
  TravelProvider,
  TripOption,
  TripSearchCriteria,
  TripSearchResults,
} from "./trip/types";

const DEMO_TRANSPORT_PROVIDER_ID = "tripweaver-demo-flights";
const DEMO_ACCOMMODATION_PROVIDER_ID = "tripweaver-demo-stays";

function offersExcludingSuppressedDemo<TOffer>(
  searches: Array<{ offers: TOffer[]; status: ProviderStatus }>,
  demoProviderId: string,
) {
  const realProviderSucceeded = searches.some(
    (result) => result.status.providerId !== demoProviderId && result.status.ok && result.offers.length > 0,
  );

  return searches
    .filter((result) => realProviderSucceeded ? result.status.providerId !== demoProviderId : true)
    .flatMap((result) => result.offers);
}

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
// volumes (seen live: 62 Duffel flights × ~200 hotels across providers)
// an uncapped cross-product would be 10,000+ combos, well past what's
// sane to hand the optimizer agent in one prompt. 24 of each side (576
// combos max) is a ~9x increase over the old 8×8=64 cap while keeping the
// agent's prompt comfortably inside a small model's context window.
const MAX_TRANSPORT_COMBOS = 24;
const MAX_ACCOMMODATION_COMBOS = 24;

function combineOptions(transports: TransportOffer[], accommodations: AccommodationOffer[], criteria: TripSearchCriteria) {
  const currency = criteria.currency;

  return transports.slice(0, MAX_TRANSPORT_COMBOS).flatMap((transport) =>
    accommodations.slice(0, MAX_ACCOMMODATION_COMBOS).map((accommodation) => ({
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

export async function searchTrip(
  criteria: TripSearchCriteria,
  weights?: OptimizerWeights,
): Promise<TripSearchResults> {
  // Package providers are billed per search (Apify's pay-per-event
  // pricing) — unlike flights/hotels, only call them when the user
  // actually wants packages, not on every search regardless of the
  // toggle.
  const wantsPackages = criteria.packageHolidays !== false;

  const [transportSearches, accommodationSearches, packageSearches] = await Promise.all([
    Promise.all(transportProviders.map((provider) => searchProvider(provider, criteria))),
    Promise.all(accommodationProviders.map((provider) => searchProvider(provider, criteria))),
    wantsPackages ? Promise.all(packageProviders.map((provider) => searchProvider(provider, criteria))) : [],
  ]);

  const transportOptions = filterByTransportModes(
    offersExcludingSuppressedDemo(transportSearches, DEMO_TRANSPORT_PROVIDER_ID),
    criteria.transportModes,
  ).sort((a, b) => a.totalPrice.amount - b.totalPrice.amount);
  const accommodationOptions = offersExcludingSuppressedDemo(accommodationSearches, DEMO_ACCOMMODATION_PROVIDER_ID).sort(
    (a, b) => a.totalPrice.amount - b.totalPrice.amount,
  );
  const packageOptions = packageSearches
    .flatMap((result) => result.offers)
    .sort((a, b) => a.totalPrice.amount - b.totalPrice.amount);
  const tripOptions = filterByBudget(
    combineOptions(transportOptions, accommodationOptions, criteria),
    criteria,
  ).sort((a, b) => a.totalPrice.amount - b.totalPrice.amount);

  const optimizerReview = await reviewTripOptionsWithAgent({
    criteria,
    transportOptions,
    accommodationOptions,
    tripOptions,
    weights: weights ?? defaultWeights,
    changeReason: "Initial search",
  });

  return {
    transportOptions,
    accommodationOptions,
    packageOptions,
    tripOptions,
    providerStatuses: [...transportSearches, ...accommodationSearches, ...packageSearches].map(
      (result) => result.status,
    ),
    optimizerReview,
  };
}
