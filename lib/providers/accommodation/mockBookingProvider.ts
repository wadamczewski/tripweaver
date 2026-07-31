import { moneyFromPln } from "@/lib/currency";
import { nightsBetween, providerDelay, providerUrls } from "@/lib/providers/providerUtils";
import type { AccommodationOption, AccommodationProvider, RoomOccupancy, SearchCriteria } from "@/lib/types";

const stayImages = [
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
];

export const mockBookingProvider: AccommodationProvider = {
  id: "mock-booking",
  name: "Mock Booking Adapter",
  async search(criteria) {
    await providerDelay(340);
    const nights = nightsBetween(criteria);
    const hasTeen = criteria.travelers.travelers.some((traveler) => traveler.type === "child" && traveler.ageAtDeparture >= 13);
    const rooms = criteria.rooms;

    return [
      stay(criteria, {
        id: "stay-mediterrani-family",
        provider: "Booking.com-style demo",
        name: "Hotel Mediterrani Family",
        location: "Eixample, Barcelona",
        rating: 4.4,
        reviews: 1840,
        nights,
        roomType: "Family room + sofa bed",
        boardType: "Breakfast included",
        pricePln: criteria.flexibleDates ? 3720 : 4320,
        cancellation: "Free cancellation until 7 days before arrival",
        childPolicy: "Children under 12 can share existing beds free.",
        occupancyExplanation: hasTeen
          ? "The hotel treats the 14-year-old traveler as an adult, but this family room allows three adult-priced guests."
          : "This family room supports two adults and two children under 12.",
        rooms,
        available: true,
        imageUrl: stayImages[0]
      }),
      stay(criteria, {
        id: "stay-ramblas-budget",
        provider: "Hotels.com-style demo",
        name: "Ramblas Smart Stay",
        location: "Gothic Quarter",
        rating: 3.8,
        reviews: 920,
        nights,
        roomType: "Triple room",
        boardType: "Room only",
        pricePln: 2980,
        cancellation: "Non-refundable demo rate",
        childPolicy: "Guests aged 13+ count as adults for occupancy.",
        occupancyExplanation: "Self-organized cheapest stay; food estimate is higher because no meals are included.",
        rooms,
        available: true,
        imageUrl: stayImages[1]
      }),
      stay(criteria, {
        id: "stay-beach-two-rooms",
        provider: "Expedia-style demo",
        name: "Nova Icaria Beach Resort",
        location: "Barcelona beach",
        rating: 4.7,
        reviews: 2640,
        nights,
        roomType: "Two connecting double rooms",
        boardType: "Half board",
        pricePln: 5140,
        cancellation: "Partially refundable with hotel credit",
        childPolicy: "Teenagers are priced as adults.",
        occupancyExplanation: "This offer requires two rooms because the hotel allows a maximum of three guests per room.",
        rooms: [
          { roomId: "room-1", adults: 2, childAges: [], infantAges: [] },
          { roomId: "room-2", adults: hasTeen ? 1 : 0, childAges: hasTeen ? [] : [14], infantAges: [] }
        ],
        available: true,
        imageUrl: stayImages[2]
      }),
      stay(criteria, {
        id: "stay-rejected-family",
        provider: "Booking.com-style demo",
        name: "Born Boutique Family Room",
        location: "El Born",
        rating: 4.2,
        reviews: 612,
        nights,
        roomType: "Family room",
        boardType: "Breakfast available",
        pricePln: 3460,
        cancellation: "Free cancellation until 14 days before arrival",
        childPolicy: "Children must be under 12 for family-room occupancy.",
        occupancyExplanation: "This family room supports two adults and two children under 12.",
        rooms,
        available: false,
        unavailableReason: "Rejected because the 14-year-old is counted as an adult and the room allows only two adults.",
        imageUrl: stayImages[0]
      })
    ];
  }
};

function stay(criteria: SearchCriteria, options: {
  id: string;
  provider: string;
  name: string;
  location: string;
  rating: number;
  reviews: number;
  nights: number;
  roomType: string;
  boardType: string;
  pricePln: number;
  cancellation: string;
  childPolicy: string;
  occupancyExplanation: string;
  rooms: RoomOccupancy[];
  available: boolean;
  unavailableReason?: string;
  imageUrl: string;
}): AccommodationOption {
  return {
    id: options.id,
    provider: options.provider,
    name: options.name,
    location: options.location,
    rating: options.rating,
    reviewCount: options.reviews,
    nights: options.nights,
    roomType: options.roomType,
    roomAllocation: options.rooms,
    boardType: options.boardType,
    totalPrice: moneyFromPln(options.pricePln, criteria.currency),
    taxesIncluded: true,
    cancellationPolicy: options.cancellation,
    childPolicy: options.childPolicy,
    occupancyExplanation: options.occupancyExplanation,
    bookingUrl: providerUrls.booking,
    available: options.available,
    unavailableReason: options.unavailableReason,
    imageUrl: options.imageUrl
  };
}
