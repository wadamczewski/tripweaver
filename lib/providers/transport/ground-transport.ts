import type { TransportOffer, TravelProvider, TripSearchCriteria } from "../../trip/types";
import { resolveCoordinates } from "../geocoding";
import { money, requiredEnv } from "../http";
import { estimateGroundDurationMinutes, estimateGroundFareEur, getDrivingRoute, type GroundMode } from "../routing";

// Real providers here (Duffel) only cover flights, which need an IATA code
// on both ends — origin/destination cities outside CITY_DATABASE fail with
// "no IATA code configured" rather than silently returning nothing useful.
// This provider fills that gap for ANY typed place: it geocodes origin and
// destination (see geocoding.ts) and derives cost ESTIMATES for
// transfer/bus/train from a real driving distance/duration (see routing.ts)
// between them. There is no self-serve API that returns real worldwide
// point-to-point ticket prices for arbitrary train/bus/shuttle routes
// (Rome2Rio and similar are partner/sales-gated, not self-serve) — so
// unlike Duffel's real fares, these prices are clearly-labeled estimates,
// the same honesty pattern the app already uses for per-traveler price
// splits and cost-breakdown line items (see ESTIMATE_NOTES in
// lib/adapters/results.ts). See connected-flights.ts for the case where a
// non-airport place is instead connected to a nearby real flight.

// Ground travel stops being a realistic primary option well before this;
// beyond it, flights are the only sane choice anyway.
const MAX_GROUND_DISTANCE_KM = 1500;
const MIN_GROUND_DISTANCE_KM = 2;

const MODES: Array<{ mode: GroundMode; label: string }> = [
  { mode: "transfer", label: "Private transfer" },
  { mode: "bus", label: "Coach/bus" },
  { mode: "train", label: "Train" },
];

function estimateNote(mode: string, distanceKm: number): string {
  return `Estimated ${mode} fare derived from a real driving distance (${Math.round(distanceKm)} km one-way via OpenRouteService) — not a live schedule or price quote.`;
}

// The road/rail distance is the same in both directions, so the return leg
// reuses the same real driving duration as an estimate — not measured
// separately, but a fair one for a symmetric route.
function inboundNote(mode: string, origin: string, destination: string): string {
  return `Return leg (${destination} to ${origin}), same estimated ${mode} fare/duration as the outbound leg.`;
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
    const routeId = `${criteria.origin}-${criteria.destination}`.toLowerCase().replace(/\s+/g, "_");

    return MODES.map(({ mode, label }): TransportOffer => ({
      id: `ground-${mode}-${routeId}`,
      providerId: "ground-transport",
      providerName: "Ground transport (estimated)",
      providerOfferId: mode,
      mode,
      title: `${label} · ${criteria.origin} to ${criteria.destination}`,
      outboundSummary: estimateNote(label.toLowerCase(), route.distanceKm),
      inboundSummary: inboundNote(label.toLowerCase(), criteria.origin, criteria.destination),
      durationMinutes: estimateGroundDurationMinutes(mode, route.durationMinutes),
      inboundDurationMinutes: estimateGroundDurationMinutes(mode, route.durationMinutes),
      stops: 0,
      inboundStops: 0,
      totalPrice: money(estimateGroundFareEur(mode, route.distanceKm, payingTravelers), "EUR"),
    }));
  },
};
