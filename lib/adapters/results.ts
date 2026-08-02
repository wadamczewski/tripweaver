import { addMoney, convertMoney, money, moneyFromPln } from "../currency";
import { getRoomSummary } from "../../components/results/helpers";
import {
  categoryForTraveler,
  travelerLabel,
  weightForCategory,
  type ProviderKind
} from "../providers/travelerMapping";
import { scoreTripOptions } from "../scoring";
import type {
  AccommodationOption,
  Money,
  PackageHoliday,
  PriceBreakdown,
  ProviderTravelerCategory,
  RoomOccupancy,
  SearchCriteria,
  SearchResults,
  TimelineItem,
  Traveler,
  TransportMode,
  TransportOption,
  TransportSegment,
  TravelerPrice,
  TripOption
} from "../types";
import type {
  AccommodationOffer,
  Money as RealMoney,
  PackageOffer,
  TransportOffer,
  TripOption as RealTripOption,
  TripSearchResults
} from "../trip/types";

// Real providers price offers in whatever currency they operate in (e.g.
// the Apify DACH package actor returns EUR regardless of the search
// currency) — this must actually convert, not just tag the amount with
// whatever currency happens to be valid, or a EUR price silently gets
// displayed/compared as if it were the same number of PLN.
function toRichMoney(value: RealMoney, targetCurrency: SearchCriteria["currency"]): Money {
  const sourceCurrency = value.currency === "PLN" || value.currency === "EUR" ? value.currency : targetCurrency;
  return convertMoney(money(value.amount, sourceCurrency), targetCurrency);
}

const CARBON_KG_PER_HOUR: Record<TransportMode, number> = {
  flight: 90,
  car: 40,
  bus: 12,
  train: 6,
  ferry: 60,
  transfer: 8
};

const ESTIMATE_NOTES = [
  "Per-traveler pricing is an estimated proportional split of the provider's real total price, not a fare rule the provider returned directly.",
  "Local transport, food, insurance, and booking fees are flat per-trip estimates, not live provider prices.",
  "Room allocation reflects what you requested; confirm exact occupancy rules with the provider before booking."
];

function nightsBetween(departureDate: string, returnDate: string): number {
  const departure = new Date(departureDate);
  const arrival = new Date(returnDate);
  const days = Math.round((arrival.getTime() - departure.getTime()) / 86_400_000);
  return Math.max(1, days || 1);
}

function addMinutes(iso: string, minutes: number): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Date(parsed.getTime() + minutes * 60_000).toISOString();
}

function providerKindForMode(mode: TransportMode): ProviderKind {
  if (mode === "flight") return "airline";
  if (mode === "train") return "rail";
  if (mode === "bus") return "bus";
  return "bus";
}

function estimateCarbonKg(mode: TransportMode, durationMinutes = 120): number {
  const perHour = CARBON_KG_PER_HOUR[mode] ?? 30;
  return Math.round(perHour * (durationMinutes / 60));
}

function travelerNote(
  traveler: Traveler,
  kind: ProviderKind,
  category: ProviderTravelerCategory
): string | undefined {
  if (traveler.type === "child" && category === "ADULT") {
    return kind === "hotel"
      ? `This property's estimated pricing treats the ${traveler.ageAtDeparture}-year-old traveler as an adult.`
      : `This provider's estimated pricing treats the ${traveler.ageAtDeparture}-year-old traveler as an adult fare.`;
  }

  if (traveler.type === "infant" && category === "INFANT_NO_SEAT") {
    return "Estimated as an infant fare without a separate seat.";
  }

  if (traveler.type === "child" && category === "CHILD") {
    return "Estimated child discount applied based on age.";
  }

  return undefined;
}

function allocateTravelerPrices(total: Money, travelers: Traveler[], kind: ProviderKind): TravelerPrice[] {
  if (travelers.length === 0) return [];

  const currency = total.currency;
  const categories = travelers.map((traveler) => categoryForTraveler(traveler, kind));
  const weights = categories.map((category) => weightForCategory(category));
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;

  return travelers.map((traveler, index) => {
    const category = categories[index];
    const share = weights[index] / weightSum;

    return {
      travelerId: traveler.id,
      travelerLabel: travelerLabel(traveler),
      providerCategory: category,
      basePrice: money(total.amount * share, currency),
      taxes: money(0, currency),
      fees: money(0, currency),
      note: travelerNote(traveler, kind, category)
    };
  });
}

function toTransportOption(offer: TransportOffer, criteria: SearchCriteria): TransportOption {
  const kind = providerKindForMode(offer.mode);
  const totalPrice = toRichMoney(offer.totalPrice, criteria.currency);
  const travelerPrices = allocateTravelerPrices(totalPrice, criteria.travelers.travelers, kind);
  const durationMinutes = offer.durationMinutes ?? 240;
  const departureTime = criteria.departureDate;
  const arrivalTime = addMinutes(`${criteria.departureDate}T00:00:00.000Z`, durationMinutes);
  // offer.luggageIncluded now reflects the airline's real baggage allowance
  // (see duffel.ts), not the search toggle — only add an estimated fee when
  // the traveler actually said they need checked luggage and the real fare
  // doesn't already include it. If they don't need it, no fee either way.
  const luggagePrice =
    offer.luggageIncluded || !criteria.checkedLuggage ? money(0, criteria.currency) : moneyFromPln(120, criteria.currency);

  const segment: TransportSegment = {
    id: `${offer.id}-segment`,
    mode: offer.mode,
    provider: offer.providerName,
    origin: criteria.origin,
    destination: criteria.destination,
    departureTime,
    arrivalTime,
    durationMinutes,
    transfers: offer.stops ?? 0,
    price: totalPrice,
    luggageIncluded: offer.luggageIncluded ?? false,
    bookingUrl: offer.bookingUrl
  };

  return {
    id: offer.id,
    label: offer.title,
    provider: offer.providerName,
    modes: [offer.mode],
    origin: criteria.origin,
    destination: criteria.destination,
    departureTime,
    arrivalTime,
    totalDurationMinutes: durationMinutes,
    transfers: offer.stops ?? 0,
    segments: [segment],
    travelerPrices,
    basePrice: totalPrice,
    luggagePrice,
    transferPrice: money(0, criteria.currency),
    totalPrice,
    luggageIncluded: offer.luggageIncluded ?? false,
    carbonKg: estimateCarbonKg(offer.mode, offer.durationMinutes),
    bookingUrl: offer.bookingUrl,
    providerNotes: [
      offer.outboundSummary,
      offer.operatingCarriers && offer.operatingCarriers.length > 0
        ? `Operated by ${offer.operatingCarriers.join(", ")}`
        : undefined
    ].filter((note): note is string => Boolean(note))
  };
}

function toAccommodationOption(
  offer: AccommodationOffer,
  criteria: SearchCriteria,
  fallbackImageUrl: string
): AccommodationOption {
  const roomAllocation: RoomOccupancy[] = criteria.rooms;
  const nights = offer.nights ?? nightsBetween(criteria.departureDate, criteria.returnDate);

  return {
    id: offer.id,
    provider: offer.providerName,
    name: offer.name,
    location: offer.location ?? criteria.destination,
    rating: offer.rating ?? offer.stars ?? 3,
    reviewCount: offer.reviewCount ?? 0,
    nights,
    roomType: offer.roomName ?? "Standard room",
    roomAllocation,
    boardType: offer.boardType ?? "Confirm board type with provider",
    totalPrice: toRichMoney(offer.totalPrice, criteria.currency),
    taxesIncluded: true,
    cancellationPolicy: offer.cancellationPolicy ?? "Confirm cancellation terms with the provider before booking.",
    occupancyExplanation: `${getRoomSummary(roomAllocation)} as requested.`,
    bookingUrl: offer.bookingUrl,
    available: true,
    // Each provider's own photo when it has one (e.g. Hotelbeds' Content API,
    // Skyscanner's listing image); only demo/undecorated offers fall back to
    // the shared destination backdrop, so real hotels don't all look identical.
    imageUrl: offer.imageUrl ?? fallbackImageUrl,
    imageUrls: offer.imageUrls && offer.imageUrls.length > 0 ? offer.imageUrls : [offer.imageUrl ?? fallbackImageUrl],
    latitude: offer.latitude,
    longitude: offer.longitude
  };
}

function toPackageHoliday(offer: PackageOffer, criteria: SearchCriteria, fallbackImageUrl: string): PackageHoliday {
  const nights = offer.nights ?? nightsBetween(criteria.departureDate, criteria.returnDate);
  const totalPrice = toRichMoney(offer.totalPrice, criteria.currency);
  const travelerPrices = allocateTravelerPrices(totalPrice, criteria.travelers.travelers, "package");

  return {
    id: offer.id,
    provider: offer.providerName,
    tourOperator: offer.tourOperator,
    departureAirport: offer.departureAirport ?? criteria.origin,
    destination: offer.destination ?? criteria.destination,
    hotelName: offer.hotelName,
    hotelRating: offer.hotelRating ?? 3,
    durationNights: nights,
    boardType: offer.boardType ?? "Confirm board type with provider",
    roomType: offer.roomType ?? "Standard room",
    roomAllocation: criteria.rooms,
    luggageIncluded: offer.luggageIncluded ?? false,
    airportTransferIncluded: offer.airportTransferIncluded ?? false,
    totalPrice,
    bookingUrl: offer.bookingUrl,
    // This provider prices the whole family into totalPrice without
    // breaking out a distinct child-specific discount — zero rather than
    // fabricating a number that isn't in the source data.
    childDiscount: money(0, criteria.currency),
    travelerPrices,
    ageNotes: [],
    savingBadge: offer.savingPercent ? `Save ${Math.round(offer.savingPercent)}%` : undefined,
    cancellationPolicy: offer.cancellationPolicy ?? "Confirm cancellation terms with the provider before booking.",
    imageUrl: offer.imageUrl ?? fallbackImageUrl,
    imageUrls: offer.imageUrls && offer.imageUrls.length > 0 ? offer.imageUrls : undefined
  };
}

// Lets a package holiday reuse the same gallery/details modal as a real
// hotel (HotelDetailsModal) instead of a separate, duplicated component —
// a package's hotel fields map onto AccommodationOption cleanly since it's
// a real hotel stay, just bundled with transport under one price.
export function packageAsAccommodation(pkg: PackageHoliday): AccommodationOption {
  return {
    id: pkg.id,
    provider: pkg.tourOperator,
    name: pkg.hotelName,
    location: pkg.destination,
    rating: pkg.hotelRating,
    reviewCount: 0,
    nights: pkg.durationNights,
    roomType: pkg.roomType,
    roomAllocation: pkg.roomAllocation,
    boardType: pkg.boardType,
    totalPrice: pkg.totalPrice,
    taxesIncluded: true,
    cancellationPolicy: pkg.cancellationPolicy,
    bookingUrl: pkg.bookingUrl,
    available: true,
    imageUrl: pkg.imageUrl,
    imageUrls: pkg.imageUrls && pkg.imageUrls.length > 0 ? pkg.imageUrls : [pkg.imageUrl]
    // No latitude/longitude — the Apify package source doesn't provide
    // hotel coordinates, so the modal falls back to its existing "location
    // not provided" placeholder instead of a fabricated map.
  };
}

function buildTimeline(transport: TransportOption, accommodation: AccommodationOption, criteria: SearchCriteria): TimelineItem[] {
  return [
    {
      time: transport.departureTime,
      title: "Depart",
      detail: `${criteria.origin} · ${transport.provider}`,
      mode: transport.modes[0]
    },
    {
      time: transport.arrivalTime,
      title: "Arrive",
      detail: criteria.destination,
      mode: transport.modes[0]
    },
    {
      time: criteria.departureDate,
      title: "Hotel check-in",
      detail: accommodation.name
    },
    {
      time: criteria.returnDate,
      title: "Hotel check-out",
      detail: accommodation.name
    }
  ];
}

const PACKAGE_ESTIMATED_DURATION_MINUTES = 240;

function buildPackageTimeline(pkg: PackageHoliday, criteria: SearchCriteria): TimelineItem[] {
  return [
    {
      time: criteria.departureDate,
      title: "Depart",
      detail: `${pkg.departureAirport} · ${pkg.tourOperator}`,
      mode: "flight"
    },
    {
      time: criteria.departureDate,
      title: "Hotel check-in",
      detail: pkg.hotelName
    },
    {
      time: criteria.returnDate,
      title: "Hotel check-out",
      detail: pkg.hotelName
    }
  ];
}

// A package holiday is a genuine trip option — a bundled tour-operator
// price standing in for a self-organized flight+hotel combo — represented
// as a TripOption so it can sit in "Complete trips" alongside
// self-organized options, get scored/ranked by the same optimizer, and be
// reviewed by the same agent.
function toPackageTripOption(pkg: PackageHoliday, criteria: SearchCriteria): TripOption {
  const accommodation = packageAsAccommodation(pkg);
  const zero = money(0, criteria.currency);

  const breakdown: PriceBreakdown = {
    travelerPrices: pkg.travelerPrices,
    transport: zero,
    accommodation: pkg.totalPrice,
    luggage: zero,
    transfers: zero,
    localTransport: zero,
    food: zero,
    insurance: zero,
    fees: zero,
    total: pkg.totalPrice
  };

  return {
    id: pkg.id,
    label: `${pkg.tourOperator} package — ${pkg.hotelName}`,
    kind: "package",
    transportSegments: [],
    accommodation,
    packageHoliday: pkg,
    travelerGroup: criteria.travelers,
    roomAllocation: pkg.roomAllocation,
    priceBreakdown: breakdown,
    totalPrice: pkg.totalPrice,
    pricePerPerson: money(pkg.totalPrice.amount / Math.max(1, criteria.travelers.totalTravelers), criteria.currency),
    // The package actor doesn't return real flight duration — reuse the
    // same "unknown duration" default already applied to transport offers
    // missing real timing (see toTransportOption above), not a fabricated
    // precise value.
    totalDurationMinutes: PACKAGE_ESTIMATED_DURATION_MINUTES,
    transfers: pkg.airportTransferIncluded ? 0 : 1,
    carbonKg: estimateCarbonKg("flight", PACKAGE_ESTIMATED_DURATION_MINUTES),
    score: 0,
    scoreExplanation: "",
    recommendationReasons: [],
    timeline: buildPackageTimeline(pkg, criteria),
    costAssumptions: [
      "This is a single bundled tour-operator price, not broken into separate transport/accommodation line items.",
      ...ESTIMATE_NOTES
    ],
    savingOpportunities: []
  };
}

function isWithinBudget(amount: number, criteria: SearchCriteria): boolean {
  if (criteria.budget && amount > convertMoney(criteria.budget, criteria.currency).amount) return false;
  if (criteria.budgetMin && amount < convertMoney(criteria.budgetMin, criteria.currency).amount) return false;
  return true;
}

function buildRecommendationReasons(
  trip: { totalPrice: Money; totalDurationMinutes: number },
  cheapest: { totalPrice: Money },
  fastest: { totalDurationMinutes: number }
): string[] {
  const reasons: string[] = [];
  const priceDelta = trip.totalPrice.amount - cheapest.totalPrice.amount;
  const timeDelta = trip.totalDurationMinutes - fastest.totalDurationMinutes;

  if (priceDelta <= 0) {
    reasons.push("Lowest estimated total cost among the current results.");
  } else {
    reasons.push(
      `Costs ${money(priceDelta, trip.totalPrice.currency).amount} ${trip.totalPrice.currency} more than the cheapest option.`
    );
  }

  if (timeDelta <= 0) {
    reasons.push("Shortest estimated travel time among the current results.");
  } else if (timeDelta > 0) {
    const hours = Math.round(timeDelta / 60);
    reasons.push(
      hours > 0
        ? `Adds roughly ${hours}h of travel time compared with the fastest option.`
        : `Adds ${timeDelta} min of travel time compared with the fastest option.`
    );
  }

  return reasons;
}

function buildSavingOpportunities(trip: TripOption): string[] {
  const opportunities: string[] = [];

  if (!trip.transportOption?.luggageIncluded) {
    opportunities.push(
      `Adding checked luggage would add an estimated ${trip.priceBreakdown.luggage.amount} ${trip.priceBreakdown.luggage.currency}.`
    );
  }

  if (trip.roomAllocation.length > 1) {
    opportunities.push("Combining into a single larger room could reduce the accommodation cost, if the property offers one.");
  }

  return opportunities;
}

export function toSearchResults(
  criteria: SearchCriteria,
  destinationImageUrl: string,
  real: TripSearchResults
): SearchResults {
  const transportOptions = real.transportOptions.map((offer) => toTransportOption(offer, criteria));
  const accommodationOptions = real.accommodationOptions.map((offer) =>
    toAccommodationOption(offer, criteria, destinationImageUrl)
  );
  const packageHolidays = real.packageOptions.map((offer) => toPackageHoliday(offer, criteria, destinationImageUrl));
  // The dedicated Packages tab shows every real package found regardless of
  // budget (informational); only the merged "Complete trips" comparison
  // below respects it, same as self-organized combos already do
  // server-side (see filterByBudget in lib/search.ts).
  const packageTripOptions = packageHolidays
    .filter((pkg) => isWithinBudget(pkg.totalPrice.amount, criteria))
    .map((pkg) => toPackageTripOption(pkg, criteria));

  const transportById = new Map(transportOptions.map((option) => [option.id, option]));
  const accommodationById = new Map(accommodationOptions.map((option) => [option.id, option]));

  const localTransport = moneyFromPln(380, criteria.currency);
  const insurance = moneyFromPln(210 * criteria.travelers.totalTravelers, criteria.currency);
  const fees = moneyFromPln(130, criteria.currency);

  const tripOptions: TripOption[] = real.tripOptions
    .map((realTrip: RealTripOption) => {
      const transport = transportById.get(realTrip.transport.id);
      const accommodation = accommodationById.get(realTrip.accommodation.id);
      if (!transport || !accommodation) return null;

      const food = moneyFromPln(90 * accommodation.nights * criteria.travelers.totalTravelers, criteria.currency);
      const breakdown: PriceBreakdown = {
        travelerPrices: transport.travelerPrices,
        transport: transport.totalPrice,
        accommodation: accommodation.totalPrice,
        luggage: transport.luggagePrice,
        transfers: transport.transferPrice,
        localTransport,
        food,
        insurance,
        fees,
        total: addMoney(
          [
            transport.totalPrice,
            accommodation.totalPrice,
            transport.luggagePrice,
            transport.transferPrice,
            localTransport,
            food,
            insurance,
            fees
          ],
          criteria.currency
        )
      };

      const trip: TripOption = {
        id: realTrip.id,
        label: `${transport.provider} + ${accommodation.provider}`,
        kind: "self-organized",
        transportOption: transport,
        transportSegments: transport.segments,
        accommodation,
        travelerGroup: criteria.travelers,
        roomAllocation: accommodation.roomAllocation,
        priceBreakdown: breakdown,
        totalPrice: breakdown.total,
        pricePerPerson: money(
          breakdown.total.amount / Math.max(1, criteria.travelers.totalTravelers),
          criteria.currency
        ),
        totalDurationMinutes: transport.totalDurationMinutes,
        transfers: transport.transfers,
        carbonKg: transport.carbonKg,
        score: 0,
        scoreExplanation: "",
        recommendationReasons: [],
        timeline: buildTimeline(transport, accommodation, criteria),
        costAssumptions: ESTIMATE_NOTES,
        savingOpportunities: []
      };

      return trip;
    })
    .filter((trip): trip is TripOption => trip !== null);

  // Package-derived options are merged in here — after this point,
  // "trip options" means both self-organized combos and package holidays,
  // scored/ranked together by the same optimizer.
  const allTripOptions = [...tripOptions, ...packageTripOptions];

  if (allTripOptions.length > 0) {
    const cheapest = [...allTripOptions].sort((a, b) => a.totalPrice.amount - b.totalPrice.amount)[0];
    const fastest = [...allTripOptions].sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes)[0];

    for (const trip of allTripOptions) {
      trip.recommendationReasons = buildRecommendationReasons(trip, cheapest, fastest);
      // A package is a fixed bundle — there's no real "add luggage for
      // X" style saving to compute the way there is for a self-organized
      // combo, so don't fabricate one.
      trip.savingOpportunities = trip.kind === "package" ? [] : buildSavingOpportunities(trip);
    }
  }

  return {
    criteria,
    generatedAt: new Date().toISOString(),
    transportOptions,
    accommodationOptions,
    packageHolidays,
    tripOptions: scoreTripOptions(allTripOptions, {
      price: 38,
      travelTime: 22,
      convenience: 18,
      hotelQuality: 14,
      sustainability: 8
    }),
    rejectedAccommodation: []
  };
}
