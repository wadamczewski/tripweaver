import { CITY_DATABASE } from "../cityData";
import { optionalEnv } from "./http";

export type GeoPoint = {
  lat: number;
  lng: number;
  displayName: string;
};

// Free-text place name -> coordinates for places outside the curated
// CITY_DATABASE (see cityData.ts) — this is what lets ground-transport
// routing work for any typed origin/destination, not just the ~130 cities
// with airports. Backed by OpenStreetMap Nominatim's public search API,
// which needs no API key/account, just a descriptive User-Agent per its
// usage policy (https://operations.osmfoundation.org/policies/nominatim/).
const NOMINATIM_USER_AGENT = optionalEnv(
  "NOMINATIM_USER_AGENT",
  "TripWeaver/1.0 (https://github.com/wadamczewski/tripweaver-unmocked)",
);

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

// In-memory only (per server process) — geocoding results for real places
// don't change between requests, and this keeps repeat searches for the
// same city from re-hitting Nominatim's rate-limited public endpoint.
const geocodeCache = new Map<string, GeoPoint | null>();

export async function geocodePlace(query: string): Promise<GeoPoint | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  let point: GeoPoint | null = null;

  try {
    const response = await fetch(url, { headers: { "User-Agent": NOMINATIM_USER_AGENT } });
    if (response.ok) {
      const results = (await response.json()) as NominatimResult[];
      const first = results[0];
      if (first) {
        point = { lat: Number(first.lat), lng: Number(first.lon), displayName: first.display_name };
      }
    }
  } catch {
    point = null;
  }

  geocodeCache.set(key, point);
  return point;
}

// CITY_DATABASE's curated coordinates are more accurate (city-center, not
// whatever Nominatim's top match happens to be) and avoid a network call for
// the ~130 cities already known — Nominatim is only the fallback for places
// outside that list. Shared by ground-transport.ts and
// connected-flights.ts, both of which need real coordinates for an
// arbitrary typed place.
export async function resolveCoordinates(place: string): Promise<GeoPoint | null> {
  const known = CITY_DATABASE.find((entry) => entry.city.toLowerCase() === place.trim().toLowerCase());
  if (known) return { lat: known.lat, lng: known.lng, displayName: known.city };
  return geocodePlace(place);
}
