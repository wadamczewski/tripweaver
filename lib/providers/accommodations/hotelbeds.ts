import crypto from "node:crypto";
import type { AccommodationOffer, TravelProvider, TripSearchCriteria } from "../../trip/types";
import { daysBetween, fetchJson, money, optionalEnv, requiredEnv } from "../http";
import { resolveLocation } from "../locations";

type HotelbedsCancellationPolicy = {
  amount?: string;
  from?: string;
};

type HotelbedsRate = {
  net?: string;
  sellingRate?: string;
  rateClass?: string;
  boardName?: string;
  cancellationPolicies?: HotelbedsCancellationPolicy[];
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
  latitude?: string;
  longitude?: string;
  rooms?: HotelbedsRoom[];
};

type HotelbedsSearchResponse = {
  hotels?: {
    total?: number;
    hotels?: HotelbedsHotel[];
  };
};

type HotelbedsImage = {
  type?: { code?: string };
  path?: string;
  order?: number;
  visualOrder?: number;
};

type HotelbedsContentHotel = {
  code?: number;
  images?: HotelbedsImage[];
};

type HotelbedsContentResponse = {
  hotels?: HotelbedsContentHotel[];
};

// Hotelbeds' CDN for content-API image paths (not documented in the search
// response itself — paths come from the separate Content API).
const IMAGE_BASE_URL = "https://photos.hotelbeds.com/giata/bigger";

// Hotels can have 50-100+ images; cap what we carry through the response so
// the payload stays sane. Still plenty for a real gallery.
const MAX_GALLERY_IMAGES = 30;

function signature(apiKey: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  return crypto.createHash("sha256").update(`${apiKey}${secret}${timestamp}`).digest("hex");
}

function starsFromCategoryName(categoryName?: string) {
  const match = categoryName?.match(/(\d)/);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function titleCase(value?: string): string | undefined {
  if (!value) return undefined;
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

// Hotelbeds' cancellation data is a fee schedule (amount charged if you
// cancel on/after a given date), not a plain-English policy — this turns
// the first tier into a human sentence instead of raw amounts/dates.
function describeCancellationPolicy(rate: HotelbedsRate | undefined): string | undefined {
  if (!rate) return undefined;
  if (rate.rateClass === "NRF") return "Non-refundable — the full amount is charged if you cancel.";

  const policy = rate.cancellationPolicies?.[0];
  if (!policy?.from) return undefined;

  const from = new Date(policy.from);
  const formatted = Number.isNaN(from.getTime())
    ? policy.from
    : from.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `Free cancellation until ${formatted}.`;
}

function parseCoordinate(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// Ranks "General view" (exterior) shots ahead of room/bar/pool close-ups, so
// the card thumbnail (ranked[0]) represents the hotel as a whole rather than
// one room, while the full ranked list becomes the hover gallery.
function rankImages(images: HotelbedsImage[] | undefined): string[] {
  if (!images || images.length === 0) return [];

  return [...images]
    .sort((a, b) => {
      const aGeneral = a.type?.code === "GEN" ? 0 : 1;
      const bGeneral = b.type?.code === "GEN" ? 0 : 1;
      if (aGeneral !== bGeneral) return aGeneral - bGeneral;
      return (a.visualOrder ?? a.order ?? 0) - (b.visualOrder ?? b.order ?? 0);
    })
    .map((image) => (image.path ? `${IMAGE_BASE_URL}/${image.path}` : undefined))
    .filter((src): src is string => Boolean(src))
    .slice(0, MAX_GALLERY_IMAGES);
}

// Hotelbeds' availability search returns no images at all — real photos
// live in the separate Content API. Fetched in one bulk call per search
// (not one call per hotel) so it doesn't multiply request count. Images are
// a nice-to-have: any failure here just means offers fall back to whatever
// the caller stamps on afterward, not a broken search.
async function fetchHotelImages(
  baseUrl: string,
  apiKey: string,
  secret: string,
  codes: number[],
): Promise<Map<number, string[]>> {
  const galleries = new Map<number, string[]>();
  if (codes.length === 0) return galleries;

  try {
    const response = await fetchJson<HotelbedsContentResponse>(
      `${baseUrl}/hotel-content-api/1.0/hotels?fields=code,images&codes=${codes.join(",")}&language=ENG`,
      {
        headers: {
          "Api-key": apiKey,
          "X-Signature": signature(apiKey, secret),
          Accept: "application/json",
        },
      },
    );

    for (const hotel of response.hotels ?? []) {
      if (hotel.code === undefined) continue;
      const ranked = rankImages(hotel.images);
      if (ranked.length > 0) galleries.set(hotel.code, ranked);
    }
  } catch {
    // Ignore — see comment above.
  }

  return galleries;
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
    const hotels = (response.hotels?.hotels ?? []).slice(0, 12);
    const codes = hotels.map((hotel) => hotel.code).filter((code): code is number => typeof code === "number");
    const galleries = await fetchHotelImages(baseUrl, apiKey, secret, codes);

    return hotels.map((hotel) => {
      const room = hotel.rooms?.[0];
      const rate = room?.rates?.[0];
      const gallery = hotel.code !== undefined ? galleries.get(hotel.code) : undefined;

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
        boardType: titleCase(rate?.boardName),
        cancellationPolicy: describeCancellationPolicy(rate),
        latitude: parseCoordinate(hotel.latitude),
        longitude: parseCoordinate(hotel.longitude),
        imageUrl: gallery?.[0],
        imageUrls: gallery,
        raw: hotel,
      };
    });
  },
};
