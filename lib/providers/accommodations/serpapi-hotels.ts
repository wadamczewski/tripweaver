import type { AccommodationOffer, TravelProvider, TripSearchCriteria } from "../../trip/types";
import { daysBetween, fetchJson, money, requiredEnv } from "../http";

type SerpApiRate = {
  lowest?: string;
  extracted_lowest?: number;
};

type SerpApiImage = {
  thumbnail?: string;
  original_image?: string;
};

type SerpApiProperty = {
  type?: string;
  name?: string;
  link?: string;
  property_token?: string;
  gps_coordinates?: { latitude?: number; longitude?: number };
  total_rate?: SerpApiRate;
  rate_per_night?: SerpApiRate;
  hotel_class?: string;
  extracted_hotel_class?: number;
  overall_rating?: number;
  reviews?: number;
  images?: SerpApiImage[];
};

type SerpApiHotelsResponse = {
  search_metadata?: { status?: string };
  error?: string;
  properties?: SerpApiProperty[];
};

const SERPAPI_BASE_URL = "https://serpapi.com/search";

// Google Hotels' free-text `q` takes a plain destination name — unlike
// Hotelbeds, there's no per-city destination-code lookup needed, so this
// works for any destination the user types, not just the ones with a
// hotelbedsDestinationCode hint configured.
export const serpapiHotelsProvider: TravelProvider<AccommodationOffer> = {
  id: "serpapi-hotels",
  name: "Google Hotels (SerpApi)",
  kind: "accommodation",
  async search(criteria: TripSearchCriteria) {
    const apiKey = requiredEnv("SERPAPI_KEY");
    const nights = daysBetween(criteria.departureDate, criteria.returnDate);

    const params = new URLSearchParams({
      engine: "google_hotels",
      q: criteria.destination,
      check_in_date: criteria.departureDate,
      check_out_date: criteria.returnDate,
      adults: String(criteria.travelers.adults),
      currency: criteria.currency,
      gl: "us",
      hl: "en",
      api_key: apiKey,
    });

    if (criteria.travelers.children > 0) {
      params.set("children", String(criteria.travelers.children));
      if (criteria.travelers.childAges.length > 0) {
        params.set("children_ages", criteria.travelers.childAges.join(","));
      }
    }

    // Real, documented SerpApi param — verified live. accommodationStars is
    // a minimum ("4-star" means "4-star or better"), not an exact tier, so
    // this sends every qualifying class (e.g. 4 -> "4,5") rather than just
    // the one selected — a single value previously meant "exactly this
    // class", which silently excluded better hotels and (depending on how
    // Google interpreted a lone value) could still admit worse ones.
    // Unset for "Any stay"/"Apartment", matching "no star filter".
    if (criteria.accommodationStars) {
      const qualifyingClasses: number[] = [];
      for (let stars = criteria.accommodationStars; stars <= 5; stars++) {
        qualifyingClasses.push(stars);
      }
      params.set("hotel_class", qualifyingClasses.join(","));
    }

    const response = await fetchJson<SerpApiHotelsResponse>(`${SERPAPI_BASE_URL}?${params.toString()}`);

    if (response.error) {
      throw new Error(`SerpApi Google Hotels error: ${response.error}`);
    }

    // q is a free-text destination search, so results can include vacation
    // rentals alongside hotels — keep only type "hotel" to match what the
    // rest of the app means by "accommodation". Some premium chain hotels
    // (seen live: Sofitel, Radisson Blu, Hilton) come back from Google
    // Hotels with no total_rate at all — a real "sold out"/no-quote gap in
    // the source data, not a parsing bug — so they're excluded rather than
    // shown with a fabricated PLN 0 price.
    //
    // Deliberately not following serpapi_pagination.next here: each extra
    // page costs another search against the 250/month free-tier quota, and
    // one page (~20 properties) already comfortably beats the old 12-item
    // cap. Revisit if a search-heavy workload needs deeper hotel coverage
    // and the quota can absorb it.
    const hotels = (response.properties ?? []).filter(
      (property) => property.type === "hotel" && (property.total_rate?.extracted_lowest ?? 0) > 0,
    );

    return hotels.map((hotel) => {
      const images = (hotel.images ?? [])
        .map((image) => image.original_image)
        .filter((src): src is string => Boolean(src));

      return {
        id: `serpapi-hotels-${hotel.property_token ?? hotel.name}`,
        providerId: "serpapi-hotels",
        providerName: "Google Hotels",
        providerOfferId: hotel.property_token ?? hotel.name ?? "",
        name: hotel.name ?? "Hotel",
        location: criteria.destination,
        stars: hotel.extracted_hotel_class,
        rating: hotel.overall_rating,
        reviewCount: hotel.reviews,
        nights,
        totalPrice: money(hotel.total_rate?.extracted_lowest, criteria.currency),
        bookingUrl: hotel.link,
        latitude: hotel.gps_coordinates?.latitude,
        longitude: hotel.gps_coordinates?.longitude,
        imageUrl: images[0],
        imageUrls: images.length > 0 ? images : undefined,
        raw: hotel,
      };
    });
  },
};
