import { accommodationProviders, transportProviders } from "./providers";
import { ProviderConfigError } from "./providers/http";
import { reviewTripOptionsWithAgent, defaultWeights } from "./optimizer/agent-review";
import type {
  AccommodationOffer,
  ProviderStatus,
  TransportOffer,
  TravelProvider,
  TripOption,
  TripSearchCriteria,
  TripSearchResults,
} from "./trip/types";

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

function combineOptions(transports: TransportOffer[], accommodations: AccommodationOffer[], criteria: TripSearchCriteria) {
  const currency = criteria.currency;
  const sameCurrencyTransports = transports.filter((offer) => offer.totalPrice.currency === currency);
  const sameCurrencyAccommodations = accommodations.filter((offer) => offer.totalPrice.currency === currency);

  return sameCurrencyTransports.slice(0, 8).flatMap((transport) =>
    sameCurrencyAccommodations.slice(0, 8).map((accommodation) => ({
      id: `${transport.id}__${accommodation.id}`,
      transport,
      accommodation,
      totalPrice: {
        amount: Number((transport.totalPrice.amount + accommodation.totalPrice.amount).toFixed(2)),
        currency,
      },
    })),
  ) satisfies TripOption[];
}

export async function searchTrip(criteria: TripSearchCriteria): Promise<TripSearchResults> {
  const [transportSearches, accommodationSearches] = await Promise.all([
    Promise.all(transportProviders.map((provider) => searchProvider(provider, criteria))),
    Promise.all(accommodationProviders.map((provider) => searchProvider(provider, criteria))),
  ]);

  const transportOptions = transportSearches
    .flatMap((result) => result.offers)
    .sort((a, b) => a.totalPrice.amount - b.totalPrice.amount);
  const accommodationOptions = accommodationSearches
    .flatMap((result) => result.offers)
    .sort((a, b) => a.totalPrice.amount - b.totalPrice.amount);
  const tripOptions = combineOptions(transportOptions, accommodationOptions, criteria).sort(
    (a, b) => a.totalPrice.amount - b.totalPrice.amount,
  );

  const optimizerReview = await reviewTripOptionsWithAgent({
    criteria,
    transportOptions,
    accommodationOptions,
    tripOptions,
    weights: defaultWeights,
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
