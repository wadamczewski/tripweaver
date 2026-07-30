import type { AccommodationOffer, TravelProvider, TripSearchCriteria } from "../../trip/types";
import { daysBetween, fetchJson, money, optionalEnv, requiredEnv } from "../http";
import { resolveLocation } from "../locations";

type SkyscannerHotelResult = {
  hotelId?: string;
  name?: string;
  stars?: number;
  rating?: number;
  reviews?: number;
  price?: string;
  lowestPrice?: { amount?: string; currency?: string };
  image?: string;
  deeplink?: string;
};

type SkyscannerCreateResponse = {
  sessionToken?: string;
};

type SkyscannerPollResponse = {
  status?: string;
  results?: SkyscannerHotelResult[];
  hotels?: SkyscannerHotelResult[];
};

export const skyscannerHotelsProvider: TravelProvider<AccommodationOffer> = {
  id: "skyscanner-hotels",
  name: "Skyscanner Hotels",
  kind: "accommodation",
  async search(criteria: TripSearchCriteria) {
    const destination = resolveLocation(criteria.destination);
    if (!destination.skyscannerHotelEntityId) {
      throw new Error(
        `No Skyscanner hotel entity id configured for ${criteria.destination}. Add skyscannerHotelEntityId in TRIPWEAVER_LOCATION_HINTS_JSON.`,
      );
    }

    const baseUrl = optionalEnv("SKYSCANNER_BASE_URL", "https://partners.api.skyscanner.net");
    const apiKey = requiredEnv("SKYSCANNER_API_KEY");

    const create = await fetchJson<SkyscannerCreateResponse>(
      `${baseUrl}/apiservices/v1/hotels/live/search/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          market: process.env.SKYSCANNER_MARKET ?? "PL",
          locale: process.env.SKYSCANNER_LOCALE ?? "pl-PL",
          currency: criteria.currency,
          entityId: destination.skyscannerHotelEntityId,
          checkinDate: criteria.departureDate,
          checkoutDate: criteria.returnDate,
          rooms: criteria.rooms.map((room) => ({
            adults: room.adults,
            childrenAges: room.childAges,
          })),
        }),
      },
    );

    if (!create.sessionToken) return [];

    let poll: SkyscannerPollResponse = {};
    for (let attempt = 0; attempt < 3; attempt += 1) {
      poll = await fetchJson<SkyscannerPollResponse>(
        `${baseUrl}/apiservices/v1/hotels/live/search/poll/${create.sessionToken}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
        },
      );

      if ((poll.results ?? poll.hotels ?? []).length > 0 || poll.status === "complete") break;
      await new Promise((resolve) => setTimeout(resolve, 750));
    }

    const nights = daysBetween(criteria.departureDate, criteria.returnDate);

    return (poll.results ?? poll.hotels ?? []).slice(0, 12).map((hotel) => {
      const amount = hotel.lowestPrice?.amount ?? hotel.price;
      const currency = hotel.lowestPrice?.currency ?? criteria.currency;

      return {
        id: `skyscanner-${hotel.hotelId}`,
        providerId: "skyscanner-hotels",
        providerName: "Skyscanner Hotels",
        providerOfferId: String(hotel.hotelId),
        name: hotel.name ?? "Skyscanner stay",
        stars: hotel.stars,
        rating: hotel.rating,
        reviewCount: hotel.reviews,
        nights,
        totalPrice: money(amount, currency),
        bookingUrl: hotel.deeplink,
        imageUrl: hotel.image,
        raw: hotel,
      };
    });
  },
};
