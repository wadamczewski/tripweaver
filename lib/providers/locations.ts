import { CITY_DATABASE } from "../cityData";

export type LocationHint = {
  city: string;
  countryCode?: string;
  iataCode?: string;
  latitude?: number;
  longitude?: number;
  bookingCityId?: number;
  skyscannerHotelEntityId?: string;
  hotelbedsDestinationCode?: string;
};

const builtInLocations: Record<string, LocationHint> = Object.fromEntries(
  CITY_DATABASE.map((entry) => [
    entry.city.trim().toLowerCase(),
    { city: entry.city, iataCode: entry.iata } satisfies LocationHint,
  ]),
);

function normalizeCity(value: string) {
  return value.trim().toLowerCase();
}

function envLocationHints(): Record<string, Partial<LocationHint>> {
  if (!process.env.TRIPWEAVER_LOCATION_HINTS_JSON) return {};

  try {
    return JSON.parse(process.env.TRIPWEAVER_LOCATION_HINTS_JSON);
  } catch {
    return {};
  }
}

export function resolveLocation(city: string): LocationHint {
  const key = normalizeCity(city);
  const envHints = envLocationHints();
  const envHint = envHints[key] ?? envHints[city];

  return {
    ...builtInLocations[key],
    ...envHint,
    city,
  };
}

export function requireIata(city: string) {
  const location = resolveLocation(city);
  if (!location.iataCode) {
    throw new Error(`No IATA code configured for ${city}. Add it to TRIPWEAVER_LOCATION_HINTS_JSON.`);
  }
  return location.iataCode;
}
