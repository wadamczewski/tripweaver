import { moneyFromPln } from "@/lib/currency";
import { buildTravelerPrices } from "@/lib/providers/travelerMapping";
import { providerDelay, providerUrls } from "@/lib/providers/providerUtils";
import type { PackageHoliday, PackageHolidayProvider, SearchCriteria } from "@/lib/types";

export const mockGermanTourOperatorsProvider: PackageHolidayProvider = {
  id: "mock-german-packages",
  name: "Mock German Tour Operators",
  async search(criteria) {
    await providerDelay(460);

    if (!criteria.packageHolidaysEnabled) {
      return [];
    }

    return [
      pkg(criteria, {
        id: "pkg-tui-de-berlin",
        tourOperator: "TUI Deutschland demo",
        airport: "Berlin Brandenburg",
        hotel: "Mediterrani Family Resort",
        rating: 4.5,
        board: "Half board",
        room: "Family room",
        pricePln: criteria.flexibleDates ? 6950 : 7560,
        discount: 680,
        notes: [
          "Departing from Berlin saves approximately PLN 860.",
          "The package includes transfers and luggage, making it PLN 420 cheaper overall than similar separate booking."
        ],
        badge: "German airport saves PLN 860"
      }),
      pkg(criteria, {
        id: "pkg-dertour-berlin",
        tourOperator: "DERTOUR demo",
        airport: "Berlin Brandenburg",
        hotel: "Barcelona Beachline",
        rating: 4.2,
        board: "Breakfast included",
        room: "Triple room",
        pricePln: 6680,
        discount: 740,
        notes: [
          "Package holiday becomes cheaper because of a child/youth discount and included transfer.",
          "This is the cheapest package offer in the demo."
        ],
        badge: "Package beats separate by PLN 420"
      }),
      pkg(criteria, {
        id: "pkg-check24-hamburg",
        tourOperator: "CHECK24 comparison demo",
        airport: "Hamburg",
        hotel: "Sagrada Coast Suites",
        rating: 4.7,
        board: "All inclusive",
        room: "Family suite",
        pricePln: 8120,
        discount: 460,
        notes: ["A better hotel score wins only when hotel quality weight is high."],
        badge: "Higher comfort"
      })
    ];
  }
};

function pkg(criteria: SearchCriteria, options: {
  id: string;
  tourOperator: string;
  airport: string;
  hotel: string;
  rating: number;
  board: string;
  room: string;
  pricePln: number;
  discount: number;
  notes: string[];
  badge?: string;
}): PackageHoliday {
  const travelerPrices = buildTravelerPrices(criteria, "package", {
    adultBasePln: Math.round(options.pricePln / Math.max(1, criteria.travelers.totalTravelers) * 0.84),
    childFactor: 0.58,
    youthFactor: 0.86,
    infantNoSeatFeePln: 190,
    infantSeatFactor: 0.7,
    taxRate: 0.1,
    feePln: 42,
    currency: criteria.currency
  });

  return {
    id: options.id,
    provider: "German package comparison demo",
    tourOperator: options.tourOperator,
    departureAirport: options.airport,
    destination: criteria.destination,
    hotelName: options.hotel,
    hotelRating: options.rating,
    durationNights: 7,
    boardType: options.board,
    roomType: options.room,
    roomAllocation: criteria.rooms,
    luggageIncluded: true,
    airportTransferIncluded: true,
    totalPrice: moneyFromPln(options.pricePln, criteria.currency),
    bookingUrl: providerUrls.packages,
    childDiscount: moneyFromPln(options.discount, criteria.currency),
    travelerPrices,
    ageNotes: options.notes,
    savingBadge: options.badge,
    cancellationPolicy: "Tour operator package terms · demo estimate",
    imageUrl: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80"
  };
}
