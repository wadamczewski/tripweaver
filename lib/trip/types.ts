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
  cancellationPolicy?: string;
  imageUrl?: string;
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
  tripOptions: TripOption[];
  providerStatuses: ProviderStatus[];
  optimizerReview: OptimizerAgentReview;
};
