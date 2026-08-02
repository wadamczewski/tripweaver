import { CITY_DATABASE } from "../../cityData";
import type { TransportOffer, TravelProvider, TripSearchCriteria } from "../../trip/types";
import { geocodePlace, type GeoPoint } from "../geocoding";
import { money, optionalEnv, requiredEnv } from "../http";

// Real providers here (Duffel) only cover flights, which need an IATA code
// on both ends — origin/destination cities outside CITY_DATABASE fail with
// "no IATA code configured" rather than silently returning nothing useful.
// This provider fills that gap for ANY typed place: it geocodes origin and
// destination (falling back to Nominatim for places outside the curated
// city list — see geocoding.ts), gets a real driving distance/duration
// between them from OpenRouteService, and derives cost ESTIMATES for
// car/bus/train from that real distance. There is no self-serve API that
// returns real worldwide point-to-point ticket prices for arbitrary
// train/bus/shuttle routes (Rome2Rio and similar are partner/sales-gated,
// not self-serve) — so unlike Duffel's real fares, these prices are
// clearly-labeled estimates (see ESTIMATE_NOTE), the same honesty pattern
// the app already uses for per-traveler price splits and cost-breakdown
// line items (see ESTIMATE_NOTES in lib/adapters/results.ts).

type DrivingRoute = {
  distanceKm: number;
  durationMinutes: number;
};

async function getDrivingRoute(origin: GeoPoint, destination: GeoPoint): Promise<DrivingRoute | null> {
  const apiKey = requiredEnv("OPENROUTESERVICE_API_KEY");
  const baseUrl = optionalEnv("OPENROUTESERVICE_BASE_URL", "https://api.openrouteservice.org");
  const url = `${baseUrl}/v2/directions/driving-car?api_key=${apiKey}&start=${origin.lng},${origin.lat}&end=${destination.lng},${destination.lat}`;

  const response = await fetch(url);
  // 404 from ORS means no drivable route exists between these points (e.g.
  // separated by open water) — that's a legitimate "no ground option here",
  // not an error to surface.
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`OpenRouteService error ${response.status}`);

  const data = (await response.json()) as {
    features?: Array<{ properties?: { summary?: { distance?: number; duration?: number } } }>;
  };
  const summary = data.features?.[0]?.properties?.summary;
  if (!summary?.distance || !summary?.duration) return null;

  return { distanceKm: summary.distance / 1000, durationMinutes: summary.duration / 60 };
}

// CITY_DATABASE's curated coordinates are more accurate (city-center, not
// whatever Nominatim's top match happens to be) and avoid a network call
// for the ~130 cities we already know — Nominatim is only the fallback for
// places outside that list.
async function resolveCoordinates(place: string): Promise<GeoPoint | null> {
  const known = CITY_DATABASE.find((entry) => entry.city.toLowerCase() === place.trim().toLowerCase());
  if (known) return { lat: known.lat, lng: known.lng, displayName: known.city };
  return geocodePlace(place);
}

const ROUND_TRIP = 2;

// Indicative EU average rates, not live fares — used only to turn a real
// measured distance into a directionally-sensible cost estimate. One
// vehicle regardless of group size for a private transfer; per-passenger
// for bus/train.
const TRANSFER_EUR_PER_KM = 0.9;
const TRANSFER_MIN_FARE_EUR = 35;
const BUS_EUR_PER_KM_PER_PERSON = 0.07;
const BUS_MIN_FARE_EUR = 12;
const TRAIN_EUR_PER_KM_PER_PERSON = 0.13;
const TRAIN_MIN_FARE_EUR = 15;

// Coaches run slower than a direct drive (stops, traffic); trains are
// typically faster point-to-point on a served corridor. Both are rough
// multipliers on the one real number we do have (driving duration), not a
// live schedule.
const BUS_DURATION_FACTOR = 1.2;
const TRAIN_DURATION_FACTOR = 0.75;

// Ground travel stops being a realistic primary option well before this;
// beyond it, flights are the only sane choice anyway.
const MAX_GROUND_DISTANCE_KM = 1500;
const MIN_GROUND_DISTANCE_KM = 2;

function estimateNote(mode: string, distanceKm: number): string {
  return `Estimated ${mode} fare derived from a real driving distance (${Math.round(distanceKm)} km one-way via OpenRouteService) — not a live schedule or price quote.`;
}

export const groundTransportProvider: TravelProvider<TransportOffer> = {
  id: "ground-transport",
  name: "Ground transport (estimated)",
  kind: "transport",
  async search(criteria: TripSearchCriteria) {
    // Fail fast on missing config before spending a Nominatim call.
    requiredEnv("OPENROUTESERVICE_API_KEY");

    const [origin, destination] = await Promise.all([
      resolveCoordinates(criteria.origin),
      resolveCoordinates(criteria.destination),
    ]);
    if (!origin) throw new Error(`Could not locate "${criteria.origin}"`);
    if (!destination) throw new Error(`Could not locate "${criteria.destination}"`);

    const route = await getDrivingRoute(origin, destination);
    if (!route) return [];
    if (route.distanceKm < MIN_GROUND_DISTANCE_KM || route.distanceKm > MAX_GROUND_DISTANCE_KM) return [];

    const payingTravelers = Math.max(criteria.travelers.adults + criteria.travelers.childAges.length, 1);
    const roundTripKm = route.distanceKm * ROUND_TRIP;
    const routeId = `${criteria.origin}-${criteria.destination}`.toLowerCase().replace(/\s+/g, "_");

    const offers: TransportOffer[] = [
      {
        id: `ground-transfer-${routeId}`,
        providerId: "ground-transport",
        providerName: "Ground transport (estimated)",
        providerOfferId: "transfer",
        mode: "transfer",
        title: `Private transfer · ${criteria.origin} to ${criteria.destination}`,
        outboundSummary: estimateNote("private transfer", route.distanceKm),
        durationMinutes: Math.round(route.durationMinutes),
        stops: 0,
        totalPrice: money(Math.max(roundTripKm * TRANSFER_EUR_PER_KM, TRANSFER_MIN_FARE_EUR * ROUND_TRIP), "EUR"),
      },
      {
        id: `ground-bus-${routeId}`,
        providerId: "ground-transport",
        providerName: "Ground transport (estimated)",
        providerOfferId: "bus",
        mode: "bus",
        title: `Coach/bus · ${criteria.origin} to ${criteria.destination}`,
        outboundSummary: estimateNote("coach", route.distanceKm),
        durationMinutes: Math.round(route.durationMinutes * BUS_DURATION_FACTOR),
        stops: 0,
        totalPrice: money(
          Math.max(
            roundTripKm * BUS_EUR_PER_KM_PER_PERSON * payingTravelers,
            BUS_MIN_FARE_EUR * ROUND_TRIP * payingTravelers,
          ),
          "EUR",
        ),
      },
      {
        id: `ground-train-${routeId}`,
        providerId: "ground-transport",
        providerName: "Ground transport (estimated)",
        providerOfferId: "train",
        mode: "train",
        title: `Train · ${criteria.origin} to ${criteria.destination}`,
        outboundSummary: estimateNote("train", route.distanceKm),
        durationMinutes: Math.round(route.durationMinutes * TRAIN_DURATION_FACTOR),
        stops: 0,
        totalPrice: money(
          Math.max(
            roundTripKm * TRAIN_EUR_PER_KM_PER_PERSON * payingTravelers,
            TRAIN_MIN_FARE_EUR * ROUND_TRIP * payingTravelers,
          ),
          "EUR",
        ),
      },
    ];

    return offers;
  },
};
