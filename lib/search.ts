import { accommodationProviders, transportProviders } from "./providers";
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
  const [transportSearches, accommodationSearches] = await Promise.all([
    Promise.all(transportProviders.map((provider) => searchProvider(provider, criteria))),
    Promise.all(accommodationProviders.map((provider) => searchProvider(provider, criteria))),
  ]);

  const transportOptions = offersExcludingSuppressedDemo(transportSearches, DEMO_TRANSPORT_PROVIDER_ID).sort(
    (a, b) => a.totalPrice.amount - b.totalPrice.amount,
  );
  const accommodationOptions = offersExcludingSuppressedDemo(accommodationSearches, DEMO_ACCOMMODATION_PROVIDER_ID).sort(
    (a, b) => a.totalPrice.amount - b.totalPrice.amount,
  );
  const tripOptions = combineOptions(transportOptions, accommodationOptions, criteria).sort(
    (a, b) => a.totalPrice.amount - b.totalPrice.amount,
  );

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
    tripOptions,
    providerStatuses: [...transportSearches, ...accommodationSearches].map((result) => result.status),
    optimizerReview,
  };
}
