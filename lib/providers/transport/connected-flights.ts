import { findNearestAirportCities, type CityEntry } from "../../cityData";
import type { TransportOffer, TravelProvider, TripSearchCriteria } from "../../trip/types";
import { convertMoney } from "../fx";
import { duffelFlightsProvider } from "../flights/duffel";
import { resolveCoordinates, type GeoPoint } from "../geocoding";
import { compactText, money, requiredEnv } from "../http";
import { resolveLocation } from "../locations";
import { estimateGroundDurationMinutes, estimateGroundFareEur, getDrivingRoute } from "../routing";

// Fills the gap ground-transport.ts can't: when one end of the trip has no
// airport at all (e.g. Zakopane), a pure ground option (car/bus/train all
// the way to Barcelona) usually isn't realistic, but driving to a nearby
// airport and flying the rest of the way is exactly what a traveler would
// actually do. This provider finds a few real candidate airport cities near
// the airport-less end (not just the nearest one — the nearest airport
// isn't always the cheapest connection) and prices each one for real: a
// real Duffel flight from/to that airport, plus an estimated ground-transfer
// leg to reach it (same estimation logic as ground-transport.ts, see
// routing.ts). The result is several concrete "connect via X" options to
// compare, not one silently-chosen guess.

const MAX_CANDIDATES = 3;
const MAX_CONNECTOR_KM = 200;
// Check-in/security/transfer time — not measured, just a reasonable fixed
// assumption, same spirit as the app's other estimate disclosures.
const CONNECTION_BUFFER_MINUTES = 90;

function payingTravelers(criteria: TripSearchCriteria) {
  return Math.max(criteria.travelers.adults + criteria.travelers.childAges.length, 1);
}

function connectionSummary(legLabel: string, airportCity: string, distanceKm: number, flightSummary: string) {
  return `Private transfer ${legLabel} ${airportCity} airport (${Math.round(distanceKm)} km, estimated fare) + ${flightSummary} — assumes a ~${CONNECTION_BUFFER_MINUTES} min connection buffer, not a verified through-fare.`;
}

async function buildOriginConnection(
  criteria: TripSearchCriteria,
  originPoint: GeoPoint,
  airportCity: CityEntry,
): Promise<TransportOffer | null> {
  try {
    const route = await getDrivingRoute(originPoint, { lat: airportCity.lat, lng: airportCity.lng, displayName: airportCity.city });
    if (!route) return null;

    const flightOffers = await duffelFlightsProvider.search({ ...criteria, origin: airportCity.city });
    if (flightOffers.length === 0) return null;
    const flight = flightOffers.reduce((a, b) => (a.totalPrice.amount <= b.totalPrice.amount ? a : b));

    const travelers = payingTravelers(criteria);
    const groundFare = convertMoney(money(estimateGroundFareEur("transfer", route.distanceKm, travelers), "EUR"), criteria.currency);
    const flightPrice = convertMoney(flight.totalPrice, criteria.currency);

    return {
      id: `connected-origin-${airportCity.iata}-${flight.id}`,
      providerId: "connected-transport",
      providerName: "Connected transport (estimated transfer + real flight)",
      providerOfferId: `origin-${airportCity.iata}-${flight.providerOfferId}`,
      mode: "flight",
      title: compactText([`${criteria.origin} to ${airportCity.city}`, `${airportCity.city} to ${criteria.destination}`]),
      outboundSummary: connectionSummary("to", airportCity.city, route.distanceKm, flight.outboundSummary),
      durationMinutes:
        estimateGroundDurationMinutes("transfer", route.durationMinutes) +
        CONNECTION_BUFFER_MINUTES +
        (flight.durationMinutes ?? 0),
      stops: 1 + (flight.stops ?? 0),
      totalPrice: money(groundFare.amount + flightPrice.amount, criteria.currency),
      bookingUrl: flight.bookingUrl,
      luggageIncluded: flight.luggageIncluded,
      operatingCarriers: flight.operatingCarriers,
    };
  } catch {
    // One candidate airport failing (no route, no flights, a transient
    // provider error) shouldn't take down the other candidates.
    return null;
  }
}

async function buildDestinationConnection(
  criteria: TripSearchCriteria,
  destinationPoint: GeoPoint,
  airportCity: CityEntry,
): Promise<TransportOffer | null> {
  try {
    const route = await getDrivingRoute({ lat: airportCity.lat, lng: airportCity.lng, displayName: airportCity.city }, destinationPoint);
    if (!route) return null;

    const flightOffers = await duffelFlightsProvider.search({ ...criteria, destination: airportCity.city });
    if (flightOffers.length === 0) return null;
    const flight = flightOffers.reduce((a, b) => (a.totalPrice.amount <= b.totalPrice.amount ? a : b));

    const travelers = payingTravelers(criteria);
    const groundFare = convertMoney(money(estimateGroundFareEur("transfer", route.distanceKm, travelers), "EUR"), criteria.currency);
    const flightPrice = convertMoney(flight.totalPrice, criteria.currency);

    return {
      id: `connected-dest-${airportCity.iata}-${flight.id}`,
      providerId: "connected-transport",
      providerName: "Connected transport (real flight + estimated transfer)",
      providerOfferId: `dest-${airportCity.iata}-${flight.providerOfferId}`,
      mode: "flight",
      title: compactText([`${criteria.origin} to ${airportCity.city}`, `${airportCity.city} to ${criteria.destination}`]),
      outboundSummary: connectionSummary("from", airportCity.city, route.distanceKm, flight.outboundSummary),
      durationMinutes:
        (flight.durationMinutes ?? 0) +
        CONNECTION_BUFFER_MINUTES +
        estimateGroundDurationMinutes("transfer", route.durationMinutes),
      stops: 1 + (flight.stops ?? 0),
      totalPrice: money(groundFare.amount + flightPrice.amount, criteria.currency),
      bookingUrl: flight.bookingUrl,
      luggageIncluded: flight.luggageIncluded,
      operatingCarriers: flight.operatingCarriers,
    };
  } catch {
    return null;
  }
}

export const connectedFlightsProvider: TravelProvider<TransportOffer> = {
  id: "connected-transport",
  name: "Connected transport (estimated transfer + real flight)",
  kind: "transport",
  async search(criteria: TripSearchCriteria) {
    const originHasAirport = Boolean(resolveLocation(criteria.origin).iataCode);
    const destinationHasAirport = Boolean(resolveLocation(criteria.destination).iataCode);

    // Both ends already have an airport — Duffel already covers this
    // directly, a ground detour couldn't be an improvement.
    if (originHasAirport && destinationHasAirport) return [];

    // Fail once, clearly, instead of once per candidate airport below.
    requiredEnv("DUFFEL_ACCESS_TOKEN");
    requiredEnv("OPENROUTESERVICE_API_KEY");

    const offers: TransportOffer[] = [];

    if (!originHasAirport) {
      const originPoint = await resolveCoordinates(criteria.origin);
      if (originPoint) {
        const candidates = findNearestAirportCities(originPoint.lat, originPoint.lng, MAX_CANDIDATES, MAX_CONNECTOR_KM);
        const legs = await Promise.all(candidates.map((city) => buildOriginConnection(criteria, originPoint, city)));
        offers.push(...legs.filter((offer): offer is TransportOffer => offer !== null));
      }
    }

    if (!destinationHasAirport) {
      const destinationPoint = await resolveCoordinates(criteria.destination);
      if (destinationPoint) {
        const candidates = findNearestAirportCities(destinationPoint.lat, destinationPoint.lng, MAX_CANDIDATES, MAX_CONNECTOR_KM);
        const legs = await Promise.all(candidates.map((city) => buildDestinationConnection(criteria, destinationPoint, city)));
        offers.push(...legs.filter((offer): offer is TransportOffer => offer !== null));
      }
    }

    return offers;
  },
};
