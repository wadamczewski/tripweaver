export type CurrencyCode = "PLN" | "EUR" | "USD" | string;

export type TravelerCounts = {
  adults: number;
  children: number;
  infants: number;
  childAges: number[];
};

export type RoomRequest = {
  adults: number;
  childAges: number[];
  infants?: number;
};

export type TripSearchCriteria = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  travelers: TravelerCounts;
  rooms: RoomRequest[];
  currency: CurrencyCode;
  budget?: number;
  budgetMin?: number;
  transportModes?: Array<"flight" | "train" | "bus" | "car" | "ferry" | "transfer">;
  checkedLuggage?: boolean;
  packageHolidays?: boolean;
  accommodationStars?: number;
};

export type Money = {
  amount: number;
  currency: CurrencyCode;
};

export type ProviderStatus = {
  providerId: string;
  ok: boolean;
  message?: string;
};

export type TravelProvider<TOffer> = {
  id: string;
  name: string;
  kind: "transport" | "accommodation" | "package";
  search(criteria: TripSearchCriteria): Promise<TOffer[]>;
};

export type TransportOffer = {
  id: string;
  providerId: string;
  providerName: string;
  providerOfferId: string;
  mode: "flight" | "train" | "bus" | "car" | "ferry" | "transfer";
  title: string;
  outboundSummary: string;
  inboundSummary?: string;
  durationMinutes?: number;
  stops?: number;
  totalPrice: Money;
  bookingUrl?: string;
  luggageIncluded?: boolean;
  operatingCarriers?: string[];
  raw?: unknown;
};

export type AccommodationOffer = {
  id: string;
  providerId: string;
  providerName: string;
  providerOfferId: string;
  name: string;
  location?: string;
  stars?: number;
  rating?: number;
  reviewCount?: number;
  roomName?: string;
  nights?: number;
  totalPrice: Money;
  bookingUrl?: string;
  boardType?: string;
  cancellationPolicy?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  // Full photo set when the provider has more than one (e.g. Hotelbeds'
  // Content API); imageUrl is always imageUrls[0] when both are present.
  imageUrls?: string[];
  raw?: unknown;
};

export type PackageOffer = {
  id: string;
  providerId: string;
  providerName: string;
  providerOfferId: string;
  tourOperator: string;
  departureAirport?: string;
  destination?: string;
  hotelName: string;
  hotelRating?: number;
  nights?: number;
  boardType?: string;
  roomType?: string;
  luggageIncluded?: boolean;
  airportTransferIncluded?: boolean;
  totalPrice: Money;
  cancellationPolicy?: string;
  savingPercent?: number;
  imageUrl?: string;
  imageUrls?: string[];
  bookingUrl?: string;
  raw?: unknown;
};

export type TripOption = {
  id: string;
  transport: TransportOffer;
  accommodation: AccommodationOffer;
  totalPrice: Money;
  score?: number;
};

export type OptimizerWeights = {
  price: number;
  speed: number;
  comfort: number;
  luggage: number;
  familyFit: number;
};

export type OptimizerAgentReview = {
  recommendedTripId?: string;
  headline: string;
  summary: string;
  rankedTripIds: string[];
  warnings: string[];
  appliedWeights: OptimizerWeights;
  generatedAt: string;
  model?: string;
};

export type TripSearchResults = {
  transportOptions: TransportOffer[];
  accommodationOptions: AccommodationOffer[];
  packageOptions: PackageOffer[];
  tripOptions: TripOption[];
  providerStatuses: ProviderStatus[];
  // Undefined until the Trip Optimizer agent call (run separately from the
  // core search — see lib/search.ts) resolves.
  optimizerReview?: OptimizerAgentReview;
};

// The fast half of a search: real transport + accommodation results and
// their cross-product, without waiting on packages or the agent review —
// see searchTripCore in lib/search.ts.
export type TripSearchCoreResults = {
  transportOptions: TransportOffer[];
  accommodationOptions: AccommodationOffer[];
  tripOptions: TripOption[];
  providerStatuses: ProviderStatus[];
};

// Package holidays are billed per search and can take 30-140+ seconds
// (real German tour-operator sites) — fetched independently of the core
// search so they never block the results page. See searchPackageHolidays.
export type PackageSearchResults = {
  packageOptions: PackageOffer[];
  providerStatuses: ProviderStatus[];
};
