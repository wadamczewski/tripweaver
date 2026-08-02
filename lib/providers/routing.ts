import type { GeoPoint } from "./geocoding";
import { optionalEnv, requiredEnv } from "./http";

// Shared by ground-transport.ts (a standalone origin->destination ground
// option) and connected-flights.ts (a ground leg to/from a nearby airport,
// paired with a real flight) — both need the same "real distance from
// OpenRouteService, then an indicative EU per-km fare" logic, just applied
// to different legs of a trip.

export type DrivingRoute = {
  distanceKm: number;
  durationMinutes: number;
};

export async function getDrivingRoute(origin: GeoPoint, destination: GeoPoint): Promise<DrivingRoute | null> {
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

export type GroundMode = "transfer" | "bus" | "train";

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

// Round-trip, since the whole search is round-trip (a taxi to the airport
// for the outbound leg implies a taxi back for the return, same as Duffel's
// flight price already covering both slices).
export function estimateGroundFareEur(mode: GroundMode, distanceKm: number, payingTravelers: number): number {
  const roundTripKm = distanceKm * ROUND_TRIP;
  if (mode === "transfer") return Math.max(roundTripKm * TRANSFER_EUR_PER_KM, TRANSFER_MIN_FARE_EUR * ROUND_TRIP);
  if (mode === "bus") {
    return Math.max(
      roundTripKm * BUS_EUR_PER_KM_PER_PERSON * payingTravelers,
      BUS_MIN_FARE_EUR * ROUND_TRIP * payingTravelers,
    );
  }
  return Math.max(
    roundTripKm * TRAIN_EUR_PER_KM_PER_PERSON * payingTravelers,
    TRAIN_MIN_FARE_EUR * ROUND_TRIP * payingTravelers,
  );
}

// One-way duration (matches the one-way convention TransportOffer.durationMinutes
// already uses for both Duffel and ground-transport offers).
export function estimateGroundDurationMinutes(mode: GroundMode, drivingDurationMinutes: number): number {
  if (mode === "bus") return Math.round(drivingDurationMinutes * BUS_DURATION_FACTOR);
  if (mode === "train") return Math.round(drivingDurationMinutes * TRAIN_DURATION_FACTOR);
  return Math.round(drivingDurationMinutes);
}
