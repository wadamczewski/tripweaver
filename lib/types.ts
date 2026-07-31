export type Currency = "PLN" | "EUR";

export type Money = {
  amount: number;
  currency: Currency;
};

export type TravelerType = "adult" | "child" | "infant" | "senior";

export type Traveler = {
  id: string;
  type: TravelerType;
  ageAtDeparture: number;
  requiresSeparateSeat?: boolean;
};

export type TravelerGroup = {
  travelers: Traveler[];
  totalTravelers: number;
  adults: number;
  children: number;
  infants: number;
  seniors: number;
  needsAdjacentSeats: boolean;
  needsAdjacentRooms: boolean;
};

export type RoomOccupancy = {
  roomId: string;
  adults: number;
  childAges: number[];
  infantAges: number[];
};

export type TransportMode = "flight" | "train" | "bus" | "car" | "ferry" | "transfer";

export type AccommodationStandard = "any" | "apartment" | "3-star" | "4-star" | "5-star";

export type PreferenceKey =
  | "cheapest"
  | "shortest"
  | "fewestTransfers"
  | "lowestCarbon"
  | "hotelQuality"
  | "allInclusive";

export type OptimizerWeights = {
  price: number;
  travelTime: number;
  convenience: number;
  hotelQuality: number;
  sustainability: number;
};

export type SearchCriteria = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  travelers: TravelerGroup;
  rooms: RoomOccupancy[];
  budget?: Money;
  budgetMin?: Money;
  flexibleDates: boolean;
  checkedLuggage: boolean;
  selectedTransportModes: TransportMode[];
  accommodationStandard: AccommodationStandard;
  packageHolidaysEnabled: boolean;
  currency: Currency;
  preferences: PreferenceKey[];
};

export type TransportSegment = {
  id: string;
  mode: TransportMode;
  provider: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  transfers: number;
  price: Money;
  luggageIncluded: boolean;
  bookingUrl?: string;
};

export type ProviderTravelerCategory =
  | "INFANT_NO_SEAT"
  | "INFANT_WITH_SEAT"
  | "CHILD"
  | "YOUTH"
  | "ADULT"
  | "SENIOR";

export type ProviderTravelerMapping = {
  travelerId: string;
  category: ProviderTravelerCategory;
  pricingAge: number;
};

export type TravelerPrice = {
  travelerId: string;
  travelerLabel: string;
  providerCategory: ProviderTravelerCategory;
  basePrice: Money;
  taxes: Money;
  fees: Money;
  discount?: Money;
  note?: string;
};

export type TransportOption = {
  id: string;
  label: string;
  provider: string;
  modes: TransportMode[];
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  totalDurationMinutes: number;
  transfers: number;
  segments: TransportSegment[];
  travelerPrices: TravelerPrice[];
  basePrice: Money;
  luggagePrice: Money;
  transferPrice: Money;
  totalPrice: Money;
  luggageIncluded: boolean;
  carbonKg: number;
  bookingUrl?: string;
  providerNotes: string[];
  savingBadge?: string;
};

export type AccommodationOption = {
  id: string;
  provider: string;
  name: string;
  location: string;
  rating: number;
  reviewCount: number;
  nights: number;
  roomType: string;
  roomAllocation: RoomOccupancy[];
  boardType: string;
  totalPrice: Money;
  taxesIncluded: boolean;
  cancellationPolicy: string;
  childPolicy?: string;
  occupancyExplanation?: string;
  bookingUrl?: string;
  available: boolean;
  unavailableReason?: string;
  imageUrl: string;
};

export type PackageHoliday = {
  id: string;
  provider: string;
  tourOperator: string;
  departureAirport: string;
  destination: string;
  hotelName: string;
  hotelRating: number;
  durationNights: number;
  boardType: string;
  roomType: string;
  roomAllocation: RoomOccupancy[];
  luggageIncluded: boolean;
  airportTransferIncluded: boolean;
  totalPrice: Money;
  bookingUrl?: string;
  childDiscount: Money;
  travelerPrices: TravelerPrice[];
  ageNotes: string[];
  savingBadge?: string;
  cancellationPolicy: string;
  imageUrl: string;
};

export type PriceBreakdown = {
  travelerPrices: TravelerPrice[];
  transport: Money;
  accommodation: Money;
  luggage: Money;
  transfers: Money;
  localTransport: Money;
  food: Money;
  insurance: Money;
  fees: Money;
  total: Money;
};

export type TripKind = "self-organized" | "package";

export type TripOption = {
  id: string;
  label: string;
  kind: TripKind;
  transportOption?: TransportOption;
  transportSegments: TransportSegment[];
  accommodation: AccommodationOption;
  packageHoliday?: PackageHoliday;
  travelerGroup: TravelerGroup;
  roomAllocation: RoomOccupancy[];
  priceBreakdown: PriceBreakdown;
  totalPrice: Money;
  pricePerPerson: Money;
  totalDurationMinutes: number;
  transfers: number;
  carbonKg: number;
  score: number;
  scoreExplanation: string;
  recommendationReasons: string[];
  timeline: TimelineItem[];
  costAssumptions: string[];
  savingOpportunities: string[];
};

export type TimelineItem = {
  time: string;
  title: string;
  detail: string;
  mode?: TransportMode;
};

export type SearchResults = {
  criteria: SearchCriteria;
  generatedAt: string;
  transportOptions: TransportOption[];
  accommodationOptions: AccommodationOption[];
  packageHolidays: PackageHoliday[];
  tripOptions: TripOption[];
  rejectedAccommodation: AccommodationOption[];
};

export interface TransportProvider {
  id: string;
  name: string;
  search(criteria: SearchCriteria): Promise<TransportOption[]>;
}

export interface AccommodationProvider {
  id: string;
  name: string;
  search(criteria: SearchCriteria): Promise<AccommodationOption[]>;
}

export interface PackageHolidayProvider {
  id: string;
  name: string;
  search(criteria: SearchCriteria): Promise<PackageHoliday[]>;
}
