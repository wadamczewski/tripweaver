export type CityEntry = {
  city: string;
  country: string;
  iata: string;
  // City-center coordinates (not the airport specifically) — accurate
  // enough for "which of these ~130 cities is closest to the user"
  // distance comparisons, not for navigation.
  lat: number;
  lng: number;
};

// A curated list of major cities/airports for client-side autocomplete.
// Not exhaustive by design — it's meant to make typing an origin/destination
// fast and error-free, not to be a full geo database.
export const CITY_DATABASE: CityEntry[] = [
  // Poland
  { city: "Warsaw", country: "Poland", iata: "WAW", lat: 52.2297, lng: 21.0122 },
  { city: "Kraków", country: "Poland", iata: "KRK", lat: 50.0647, lng: 19.945 },
  { city: "Gdańsk", country: "Poland", iata: "GDN", lat: 54.352, lng: 18.6466 },
  { city: "Wrocław", country: "Poland", iata: "WRO", lat: 51.1079, lng: 17.0385 },
  { city: "Poznań", country: "Poland", iata: "POZ", lat: 52.4064, lng: 16.9252 },
  { city: "Szczecin", country: "Poland", iata: "SZZ", lat: 53.4285, lng: 14.5528 },
  { city: "Katowice", country: "Poland", iata: "KTW", lat: 50.2649, lng: 19.0238 },
  { city: "Łódź", country: "Poland", iata: "LCJ", lat: 51.7592, lng: 19.456 },
  { city: "Rzeszów", country: "Poland", iata: "RZE", lat: 50.0413, lng: 21.999 },
  { city: "Bydgoszcz", country: "Poland", iata: "BZG", lat: 53.1235, lng: 18.0084 },

  // Germany
  { city: "Berlin", country: "Germany", iata: "BER", lat: 52.52, lng: 13.405 },
  { city: "Frankfurt", country: "Germany", iata: "FRA", lat: 50.1109, lng: 8.6821 },
  { city: "Munich", country: "Germany", iata: "MUC", lat: 48.1351, lng: 11.582 },
  { city: "Hamburg", country: "Germany", iata: "HAM", lat: 53.5511, lng: 9.9937 },
  { city: "Düsseldorf", country: "Germany", iata: "DUS", lat: 51.2277, lng: 6.7735 },
  { city: "Cologne", country: "Germany", iata: "CGN", lat: 50.9375, lng: 6.9603 },
  { city: "Stuttgart", country: "Germany", iata: "STR", lat: 48.7758, lng: 9.1829 },
  { city: "Nuremberg", country: "Germany", iata: "NUE", lat: 49.4521, lng: 11.0767 },
  { city: "Hannover", country: "Germany", iata: "HAJ", lat: 52.3759, lng: 9.732 },
  { city: "Leipzig", country: "Germany", iata: "LEJ", lat: 51.3397, lng: 12.3731 },
  { city: "Dresden", country: "Germany", iata: "DRS", lat: 51.0504, lng: 13.7373 },

  // Spain
  { city: "Madrid", country: "Spain", iata: "MAD", lat: 40.4168, lng: -3.7038 },
  { city: "Barcelona", country: "Spain", iata: "BCN", lat: 41.3851, lng: 2.1734 },
  { city: "Valencia", country: "Spain", iata: "VLC", lat: 39.4699, lng: -0.3763 },
  { city: "Seville", country: "Spain", iata: "SVQ", lat: 37.3891, lng: -5.9845 },
  { city: "Málaga", country: "Spain", iata: "AGP", lat: 36.7213, lng: -4.4214 },
  { city: "Bilbao", country: "Spain", iata: "BIO", lat: 43.263, lng: -2.935 },
  { city: "Palma de Mallorca", country: "Spain", iata: "PMI", lat: 39.5696, lng: 2.6502 },
  { city: "Alicante", country: "Spain", iata: "ALC", lat: 38.3452, lng: -0.481 },

  // France
  { city: "Paris", country: "France", iata: "CDG", lat: 48.8566, lng: 2.3522 },
  { city: "Nice", country: "France", iata: "NCE", lat: 43.7102, lng: 7.262 },
  { city: "Lyon", country: "France", iata: "LYS", lat: 45.764, lng: 4.8357 },
  { city: "Marseille", country: "France", iata: "MRS", lat: 43.2965, lng: 5.3698 },
  { city: "Toulouse", country: "France", iata: "TLS", lat: 43.6047, lng: 1.4442 },
  { city: "Bordeaux", country: "France", iata: "BOD", lat: 44.8378, lng: -0.5792 },
  { city: "Nantes", country: "France", iata: "NTE", lat: 47.2184, lng: -1.5536 },

  // Italy
  { city: "Rome", country: "Italy", iata: "FCO", lat: 41.9028, lng: 12.4964 },
  { city: "Milan", country: "Italy", iata: "MXP", lat: 45.4642, lng: 9.19 },
  { city: "Venice", country: "Italy", iata: "VCE", lat: 45.4408, lng: 12.3155 },
  { city: "Naples", country: "Italy", iata: "NAP", lat: 40.8518, lng: 14.2681 },
  { city: "Florence", country: "Italy", iata: "FLR", lat: 43.7696, lng: 11.2558 },
  { city: "Bologna", country: "Italy", iata: "BLQ", lat: 44.4949, lng: 11.3426 },
  { city: "Turin", country: "Italy", iata: "TRN", lat: 45.0703, lng: 7.6869 },
  { city: "Catania", country: "Italy", iata: "CTA", lat: 37.5079, lng: 15.083 },

  // United Kingdom
  { city: "London", country: "United Kingdom", iata: "LHR", lat: 51.5074, lng: -0.1278 },
  { city: "Manchester", country: "United Kingdom", iata: "MAN", lat: 53.4808, lng: -2.2426 },
  { city: "Edinburgh", country: "United Kingdom", iata: "EDI", lat: 55.9533, lng: -3.1883 },
  { city: "Birmingham", country: "United Kingdom", iata: "BHX", lat: 52.4862, lng: -1.8904 },
  { city: "Glasgow", country: "United Kingdom", iata: "GLA", lat: 55.8642, lng: -4.2518 },
  { city: "Bristol", country: "United Kingdom", iata: "BRS", lat: 51.4545, lng: -2.5879 },
  { city: "Liverpool", country: "United Kingdom", iata: "LPL", lat: 53.4084, lng: -2.9916 },

  // Portugal
  { city: "Lisbon", country: "Portugal", iata: "LIS", lat: 38.7223, lng: -9.1393 },
  { city: "Porto", country: "Portugal", iata: "OPO", lat: 41.1579, lng: -8.6291 },
  { city: "Faro", country: "Portugal", iata: "FAO", lat: 37.0194, lng: -7.9304 },

  // Netherlands / Belgium
  { city: "Amsterdam", country: "Netherlands", iata: "AMS", lat: 52.3676, lng: 4.9041 },
  { city: "Rotterdam", country: "Netherlands", iata: "RTM", lat: 51.9244, lng: 4.4777 },
  { city: "Eindhoven", country: "Netherlands", iata: "EIN", lat: 51.4416, lng: 5.4697 },
  { city: "Brussels", country: "Belgium", iata: "BRU", lat: 50.8503, lng: 4.3517 },
  { city: "Antwerp", country: "Belgium", iata: "ANR", lat: 51.2194, lng: 4.4025 },

  // Austria / Switzerland
  { city: "Vienna", country: "Austria", iata: "VIE", lat: 48.2082, lng: 16.3738 },
  { city: "Salzburg", country: "Austria", iata: "SZG", lat: 47.8095, lng: 13.055 },
  { city: "Innsbruck", country: "Austria", iata: "INN", lat: 47.2692, lng: 11.4041 },
  { city: "Zurich", country: "Switzerland", iata: "ZRH", lat: 47.3769, lng: 8.5417 },
  { city: "Geneva", country: "Switzerland", iata: "GVA", lat: 46.2044, lng: 6.1432 },
  { city: "Basel", country: "Switzerland", iata: "BSL", lat: 47.5596, lng: 7.5886 },

  // Central & Eastern Europe
  { city: "Prague", country: "Czech Republic", iata: "PRG", lat: 50.0755, lng: 14.4378 },
  { city: "Brno", country: "Czech Republic", iata: "BRQ", lat: 49.1951, lng: 16.6068 },
  { city: "Budapest", country: "Hungary", iata: "BUD", lat: 47.4979, lng: 19.0402 },
  { city: "Bratislava", country: "Slovakia", iata: "BTS", lat: 48.1486, lng: 17.1077 },
  { city: "Ljubljana", country: "Slovenia", iata: "LJU", lat: 46.0569, lng: 14.5058 },
  { city: "Bucharest", country: "Romania", iata: "OTP", lat: 44.4268, lng: 26.1025 },
  { city: "Cluj-Napoca", country: "Romania", iata: "CLJ", lat: 46.7712, lng: 23.6236 },
  { city: "Sofia", country: "Bulgaria", iata: "SOF", lat: 42.6977, lng: 23.3219 },
  { city: "Varna", country: "Bulgaria", iata: "VAR", lat: 43.2141, lng: 27.9147 },
  { city: "Zagreb", country: "Croatia", iata: "ZAG", lat: 45.815, lng: 15.9819 },
  { city: "Split", country: "Croatia", iata: "SPU", lat: 43.5081, lng: 16.4402 },
  { city: "Dubrovnik", country: "Croatia", iata: "DBV", lat: 42.6507, lng: 18.0944 },
  { city: "Kyiv", country: "Ukraine", iata: "KBP", lat: 50.4501, lng: 30.5234 },

  // Nordics & Baltics
  { city: "Copenhagen", country: "Denmark", iata: "CPH", lat: 55.6761, lng: 12.5683 },
  { city: "Stockholm", country: "Sweden", iata: "ARN", lat: 59.3293, lng: 18.0686 },
  { city: "Gothenburg", country: "Sweden", iata: "GOT", lat: 57.7089, lng: 11.9746 },
  { city: "Oslo", country: "Norway", iata: "OSL", lat: 59.9139, lng: 10.7522 },
  { city: "Bergen", country: "Norway", iata: "BGO", lat: 60.3913, lng: 5.3221 },
  { city: "Helsinki", country: "Finland", iata: "HEL", lat: 60.1699, lng: 24.9384 },
  { city: "Reykjavik", country: "Iceland", iata: "KEF", lat: 64.1466, lng: -21.9426 },
  { city: "Riga", country: "Latvia", iata: "RIX", lat: 56.9496, lng: 24.1052 },
  { city: "Vilnius", country: "Lithuania", iata: "VNO", lat: 54.6872, lng: 25.2797 },
  { city: "Tallinn", country: "Estonia", iata: "TLL", lat: 59.437, lng: 24.7536 },

  // Ireland
  { city: "Dublin", country: "Ireland", iata: "DUB", lat: 53.3498, lng: -6.2603 },
  { city: "Cork", country: "Ireland", iata: "ORK", lat: 51.8985, lng: -8.4756 },

  // Greece, Malta, Cyprus, Turkey
  { city: "Athens", country: "Greece", iata: "ATH", lat: 37.9838, lng: 23.7275 },
  { city: "Thessaloniki", country: "Greece", iata: "SKG", lat: 40.6401, lng: 22.9444 },
  { city: "Santorini", country: "Greece", iata: "JTR", lat: 36.3932, lng: 25.4615 },
  { city: "Mykonos", country: "Greece", iata: "JMK", lat: 37.4467, lng: 25.3289 },
  { city: "Malta", country: "Malta", iata: "MLA", lat: 35.8989, lng: 14.5146 },
  { city: "Larnaca", country: "Cyprus", iata: "LCA", lat: 34.9182, lng: 33.6291 },
  { city: "Istanbul", country: "Turkey", iata: "IST", lat: 41.0082, lng: 28.9784 },
  { city: "Antalya", country: "Turkey", iata: "AYT", lat: 36.8969, lng: 30.7133 },

  // North Africa
  { city: "Marrakech", country: "Morocco", iata: "RAK", lat: 31.6295, lng: -7.9811 },
  { city: "Casablanca", country: "Morocco", iata: "CMN", lat: 33.5731, lng: -7.5898 },
  { city: "Cairo", country: "Egypt", iata: "CAI", lat: 30.0444, lng: 31.2357 },
  { city: "Hurghada", country: "Egypt", iata: "HRG", lat: 27.2579, lng: 33.8116 },

  // Middle East
  { city: "Dubai", country: "United Arab Emirates", iata: "DXB", lat: 25.2048, lng: 55.2708 },
  { city: "Abu Dhabi", country: "United Arab Emirates", iata: "AUH", lat: 24.4539, lng: 54.3773 },
  { city: "Doha", country: "Qatar", iata: "DOH", lat: 25.2854, lng: 51.531 },
  { city: "Tel Aviv", country: "Israel", iata: "TLV", lat: 32.0853, lng: 34.7818 },

  // North America
  { city: "New York", country: "United States", iata: "JFK", lat: 40.7128, lng: -74.006 },
  { city: "Los Angeles", country: "United States", iata: "LAX", lat: 34.0522, lng: -118.2437 },
  { city: "Chicago", country: "United States", iata: "ORD", lat: 41.8781, lng: -87.6298 },
  { city: "Miami", country: "United States", iata: "MIA", lat: 25.7617, lng: -80.1918 },
  { city: "San Francisco", country: "United States", iata: "SFO", lat: 37.7749, lng: -122.4194 },
  { city: "Boston", country: "United States", iata: "BOS", lat: 42.3601, lng: -71.0589 },
  { city: "Washington, D.C.", country: "United States", iata: "IAD", lat: 38.9072, lng: -77.0369 },
  { city: "Toronto", country: "Canada", iata: "YYZ", lat: 43.6532, lng: -79.3832 },
  { city: "Montreal", country: "Canada", iata: "YUL", lat: 45.5017, lng: -73.5673 },
  { city: "Vancouver", country: "Canada", iata: "YVR", lat: 49.2827, lng: -123.1207 },

  // Asia-Pacific
  { city: "Tokyo", country: "Japan", iata: "NRT", lat: 35.6762, lng: 139.6503 },
  { city: "Bangkok", country: "Thailand", iata: "BKK", lat: 13.7563, lng: 100.5018 },
  { city: "Singapore", country: "Singapore", iata: "SIN", lat: 1.3521, lng: 103.8198 },
  { city: "Hong Kong", country: "Hong Kong", iata: "HKG", lat: 22.3193, lng: 114.1694 },
  { city: "Seoul", country: "South Korea", iata: "ICN", lat: 37.5665, lng: 126.978 },
  { city: "Sydney", country: "Australia", iata: "SYD", lat: -33.8688, lng: 151.2093 },
  { city: "Melbourne", country: "Australia", iata: "MEL", lat: -37.8136, lng: 144.9631 }
];

export function searchCities(query: string, limit = 8): CityEntry[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return [];

  const starts: CityEntry[] = [];
  const contains: CityEntry[] = [];

  for (const entry of CITY_DATABASE) {
    const haystack = `${entry.city} ${entry.country} ${entry.iata}`.toLowerCase();
    const cityLower = entry.city.toLowerCase();

    if (cityLower.startsWith(trimmed) || entry.iata.toLowerCase() === trimmed) {
      starts.push(entry);
    } else if (haystack.includes(trimmed)) {
      contains.push(entry);
    }

    if (starts.length >= limit) break;
  }

  return [...starts, ...contains].slice(0, limit);
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Haversine great-circle distance — accurate enough to rank ~130 cities by
// proximity, not meant for precise navigation.
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Finds the closest entry in CITY_DATABASE to a real lat/lng (e.g. from the
// browser's Geolocation API) — used to default the "Departure city" field
// to wherever the user actually is, instead of a fixed default regardless
// of who's searching.
export function findNearestCity(lat: number, lng: number): CityEntry | undefined {
  let nearest: CityEntry | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const entry of CITY_DATABASE) {
    const distance = distanceKm(lat, lng, entry.lat, entry.lng);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = entry;
    }
  }

  return nearest;
}
