import type { AccommodationOffer, TravelProvider, TripSearchCriteria } from "../../trip/types";
import { daysBetween, fetchJson, money, optionalEnv, requiredEnv } from "../http";
import { resolveLocation } from "../locations";

type BookingProduct = {
  id?: string;
  accommodation?: number;
  name?: string;
  price?: {
    book?: { amount?: number; currency?: string };
    total?: { amount?: number; currency?: string };
  };
};

type BookingAccommodation = {
  id?: number;
  name?: string;
  url?: string;
  currency?: string;
  price?: { book?: { amount?: number; currency?: string }; total?: { amount?: number; currency?: string } };
  products?: BookingProduct[];
  review_score?: number;
  review_count?: number;
  class?: number;
};

type BookingSearchResponse = {
  data?: BookingAccommodation[];
};

export const bookingAccommodationProvider: TravelProvider<AccommodationOffer> = {
  id: "booking-accommodation",
  name: "Booking.com",
  kind: "accommodation",
  async search(criteria: TripSearchCriteria) {
    const destination = resolveLocation(criteria.destination);
    if (!destination.bookingCityId) {
      throw new Error(
        `No Booking.com city id configured for ${criteria.destination}. Add bookingCityId in TRIPWEAVER_LOCATION_HINTS_JSON.`,
      );
    }

    const baseUrl = optionalEnv("BOOKING_DEMAND_BASE_URL", "https://demandapi-sandbox.booking.com/3.2");
    const token = requiredEnv("BOOKING_DEMAND_API_TOKEN");
    const affiliateId = process.env.BOOKING_AFFILIATE_ID;

    const response = await fetchJson<BookingSearchResponse>(`${baseUrl}/accommodations/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(affiliateId ? { "X-Affiliate-Id": affiliateId } : {}),
      },
      body: JSON.stringify({
        booker: {
          country: process.env.BOOKING_BOOKER_COUNTRY ?? "pl",
          platform: "desktop",
        },
        checkin: criteria.departureDate,
        checkout: criteria.returnDate,
        city: destination.bookingCityId,
        currency: criteria.currency,
        guests: {
          number_of_adults: criteria.travelers.adults,
          number_of_children: criteria.travelers.children,
          allocation: criteria.rooms.map((room) => ({
            number_of_adults: room.adults,
            children: room.childAges.map((age) => ({ age })),
          })),
        },
        extras: ["extra_charges", "products"],
      }),
    });

    const nights = daysBetween(criteria.departureDate, criteria.returnDate);

    return (response.data ?? []).slice(0, 12).map((hotel) => {
      const product = hotel.products?.[0];
      const price = product?.price ?? hotel.price;
      const total = price?.book ?? price?.total;

      return {
        id: `booking-${hotel.id ?? product?.accommodation ?? product?.id}`,
        providerId: "booking-accommodation",
        providerName: "Booking.com",
        providerOfferId: String(hotel.id ?? product?.id),
        name: hotel.name ?? product?.name ?? "Booking.com stay",
        stars: hotel.class,
        rating: hotel.review_score,
        reviewCount: hotel.review_count,
        roomName: product?.name,
        nights,
        totalPrice: money(total?.amount, total?.currency ?? hotel.currency ?? criteria.currency),
        bookingUrl: hotel.url,
        raw: hotel,
      };
    });
  },
};
