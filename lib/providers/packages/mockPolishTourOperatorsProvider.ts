import { moneyFromPln } from "@/lib/currency";
import { buildTravelerPrices, totalTravelerPrice } from "@/lib/providers/travelerMapping";
import { providerDelay, providerUrls } from "@/lib/providers/providerUtils";
import type { PackageHoliday, PackageHolidayProvider, SearchCriteria } from "@/lib/types";

export const mockPolishTourOperatorsProvider: PackageHolidayProvider = {
  id: "mock-polish-packages",
  name: "Mock Polish Tour Operators",
  async search(criteria) {
    await providerDelay(420);

    if (!criteria.packageHolidaysEnabled) {
      return [];
    }

    return [
      pkg(criteria, {
        id: "pkg-itaka-warsaw",
        provider: "Polish package comparison demo",
        tourOperator: "ITAKA demo",
        airport: "Warsaw Chopin",
        hotel: "Costa Barcelona Sun Hotel",
        rating: 4.3,
        board: "Half board",
        room: "Family room",
        pricePln: 7890,
        childDiscountPln: 360,
        cancellation: "Package cancellation per operator terms",
        notes: ["Child discount applied, but the 14-year-old receives a smaller youth reduction."],
        imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80"
      }),
      pkg(criteria, {
        id: "pkg-rainbow-poznan",
        provider: "Polish package comparison demo",
        tourOperator: "Rainbow demo",
        airport: "Poznan Lawica",
        hotel: "Aqua Family Barcelona",
        rating: 4.1,
        board: "All inclusive light",
        room: "Double room + child bed",
        pricePln: 7440,
        childDiscountPln: 520,
        cancellation: "Low deposit demo terms",
        notes: ["The package includes transfers and checked luggage, narrowing the gap to self-organized travel."],
        imageUrl: "https://images.unsplash.com/photo-1570213489059-0aac6626cade?auto=format&fit=crop&w=1200&q=80"
      }),
      pkg(criteria, {
        id: "pkg-tui-pl",
        provider: "Polish package comparison demo",
        tourOperator: "TUI Poland demo",
        airport: "Warsaw Chopin",
        hotel: "Barcelona Coast Club",
        rating: 4.6,
        board: "All inclusive",
        room: "Two rooms required",
        pricePln: 8680,
        childDiscountPln: 250,
        cancellation: "Flexible rebooking demo terms",
        notes: ["Booking two rooms increases the accommodation component by approximately PLN 1,180."],
        imageUrl: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=80"
      })
    ];
  }
};

function pkg(criteria: SearchCriteria, options: {
  id: string;
  provider: string;
  tourOperator: string;
  airport: string;
  hotel: string;
  rating: number;
  board: string;
  room: string;
  pricePln: number;
  childDiscountPln: number;
  cancellation: string;
  notes: string[];
  imageUrl: string;
}): PackageHoliday {
  const travelerPrices = buildTravelerPrices(criteria, "package", {
    adultBasePln: Math.round(options.pricePln / Math.max(1, criteria.travelers.totalTravelers) * 0.86),
    childFactor: 0.62,
    youthFactor: 0.9,
    infantNoSeatFeePln: 220,
    infantSeatFactor: 0.7,
    taxRate: 0.1,
    feePln: 55,
    currency: criteria.currency
  });
  const calculated = totalTravelerPrice(travelerPrices, criteria.currency);

  return {
    id: options.id,
    provider: options.provider,
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
    totalPrice: moneyFromPln(Math.min(options.pricePln, calculated.amount), criteria.currency),
    bookingUrl: providerUrls.packages,
    childDiscount: moneyFromPln(options.childDiscountPln, criteria.currency),
    travelerPrices,
    ageNotes: options.notes,
    cancellationPolicy: options.cancellation,
    imageUrl: options.imageUrl
  };
}
