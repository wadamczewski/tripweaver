export type LocationHint = {
  city: string;
  countryCode?: string;
  iataCode?: string;
  latitude?: number;
  longitude?: number;
  bookingCityId?: number;
  skyscannerHotelEntityId?: string;
};

const builtInLocations: Record<string, LocationHint> = {
  barcelona: {
    city: "Barcelona",
    countryCode: "ES",
    iataCode: "BCN",
    latitude: 41.3874,
    longitude: 2.1686,
  },
  berlin: {
    city: "Berlin",
    countryCode: "DE",
    iataCode: "BER",
    latitude: 52.52,
    longitude: 13.405,
  },
  szczecin: {
    city: "Szczecin",
    countryCode: "PL",
    iataCode: "SZZ",
    latitude: 53.4285,
    longitude: 14.5528,
  },
};

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
    city,
    ...builtInLocations[key],
    ...envHint,
  };
}

export function requireIata(city: string) {
  const location = resolveLocation(city);
  if (!location.iataCode) {
    throw new Error(`No IATA code configured for ${city}. Add it to TRIPWEAVER_LOCATION_HINTS_JSON.`);
  }
  return location.iataCode;
}
