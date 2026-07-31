import crypto from "node:crypto";
import type { AccommodationOffer, TravelProvider, TripSearchCriteria } from "../../trip/types";
import { daysBetween, fetchJson, money, optionalEnv, requiredEnv } from "../http";
import { resolveLocation } from "../locations";

type HotelbedsRate = {
  net?: string;
  sellingRate?: string;
  rateClass?: string;
};

type HotelbedsRoom = {
  name?: string;
  rates?: HotelbedsRate[];
};

type HotelbedsHotel = {
  code?: number;
  name?: string;
  categoryName?: string;
  zoneName?: string;
  destinationName?: string;
  currency?: string;
  minRate?: string;
  rooms?: HotelbedsRoom[];
};

type HotelbedsSearchResponse = {
  hotels?: {
    total?: number;
    hotels?: HotelbedsHotel[];
  };
};

function signature(apiKey: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  return crypto.createHash("sha256").update(`${apiKey}${secret}${timestamp}`).digest("hex");
}

function starsFromCategoryName(categoryName?: string) {
  const match = categoryName?.match(/(\d)/);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

export const hotelbedsAccommodationProvider: TravelProvider<AccommodationOffer> = {
  id: "hotelbeds-accommodation",
  name: "Hotelbeds",
  kind: "accommodation",
  async search(criteria: TripSearchCriteria) {
    const destination = resolveLocation(criteria.destination);
    if (!destination.hotelbedsDestinationCode) {
      throw new Error(
        `No Hotelbeds destination code configured for ${criteria.destination}. Add hotelbedsDestinationCode in TRIPWEAVER_LOCATION_HINTS_JSON.`,
      );
    }

    const baseUrl = optionalEnv("HOTELBEDS_BASE_URL", "https://api.test.hotelbeds.com");
    const apiKey = requiredEnv("HOTELBEDS_API_KEY");
    const secret = requiredEnv("HOTELBEDS_SECRET");

    const response = await fetchJson<HotelbedsSearchResponse>(`${baseUrl}/hotel-api/1.0/hotels`, {
      method: "POST",
      headers: {
        "Api-key": apiKey,
        "X-Signature": signature(apiKey, secret),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        stay: { checkIn: criteria.departureDate, checkOut: criteria.returnDate },
        occupancies: criteria.rooms.map((room) => ({
          rooms: 1,
          adults: room.adults,
          children: room.childAges.length,
          ...(room.childAges.length
            ? { paxes: room.childAges.map((age) => ({ type: "CH", age })) }
            : {}),
        })),
        destination: { code: destination.hotelbedsDestinationCode },
      }),
    });

    const nights = daysBetween(criteria.departureDate, criteria.returnDate);
    const hotels = response.hotels?.hotels ?? [];

    return hotels.slice(0, 12).map((hotel) => {
      const room = hotel.rooms?.[0];
      const rate = room?.rates?.[0];

      return {
        id: `hotelbeds-${hotel.code}`,
        providerId: "hotelbeds-accommodation",
        providerName: "Hotelbeds",
        providerOfferId: String(hotel.code),
        name: hotel.name ?? "Hotelbeds stay",
        location: hotel.zoneName ?? hotel.destinationName,
        stars: starsFromCategoryName(hotel.categoryName),
        roomName: room?.name,
        nights,
        totalPrice: money(rate?.sellingRate ?? rate?.net ?? hotel.minRate, criteria.currency),
        raw: hotel,
      };
    });
  },
};
