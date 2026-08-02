import type { TransportOffer, TravelProvider, TripSearchCriteria } from "../../trip/types";
import { compactText, fetchJson, money, optionalEnv, requiredEnv } from "../http";
import { requireIata } from "../locations";

type AmadeusTokenResponse = {
  access_token: string;
};

type AmadeusFlightOffer = {
  id: string;
  price?: {
    grandTotal?: string;
    currency?: string;
  };
  itineraries?: Array<{
    duration?: string;
    segments?: Array<{
      departure?: { iataCode?: string; at?: string };
      arrival?: { iataCode?: string; at?: string };
      carrierCode?: string;
      number?: string;
    }>;
  }>;
};

let cachedToken: { token: string; expiresAt: number } | undefined;

async function getAccessToken(baseUrl: string) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: requiredEnv("AMADEUS_CLIENT_ID"),
    client_secret: requiredEnv("AMADEUS_CLIENT_SECRET"),
  });

  const response = await fetchJson<AmadeusTokenResponse>(`${baseUrl}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  cachedToken = {
    token: response.access_token,
    expiresAt: Date.now() + 25 * 60_000,
  };

  return response.access_token;
}

function parseDurationMinutes(duration?: string) {
  if (!duration) return undefined;
  const hours = duration.match(/(\d+)H/)?.[1];
  const minutes = duration.match(/(\d+)M/)?.[1];
  return Number(hours ?? 0) * 60 + Number(minutes ?? 0);
}

function summarizeItinerary(offer: AmadeusFlightOffer, index: number) {
  const itinerary = offer.itineraries?.[index];
  const first = itinerary?.segments?.[0];
  const last = itinerary?.segments?.[itinerary.segments.length - 1];
  const stops = Math.max((itinerary?.segments?.length ?? 1) - 1, 0);

  return {
    summary: compactText([
      first?.departure?.iataCode && last?.arrival?.iataCode
        ? `${first.departure.iataCode} to ${last.arrival.iataCode}`
        : undefined,
      stops === 0 ? "direct" : `${stops} stop${stops === 1 ? "" : "s"}`,
    ]),
    stops,
    durationMinutes: parseDurationMinutes(itinerary?.duration),
  };
}

export const amadeusFlightsProvider: TravelProvider<TransportOffer> = {
  id: "amadeus-flights",
  name: "Amadeus",
  kind: "transport",
  async search(criteria: TripSearchCriteria) {
    const baseUrl = optionalEnv("AMADEUS_BASE_URL", "https://test.api.amadeus.com");
    const token = await getAccessToken(baseUrl);
    const params = new URLSearchParams({
      originLocationCode: requireIata(criteria.origin),
      destinationLocationCode: requireIata(criteria.destination),
      departureDate: criteria.departureDate,
      returnDate: criteria.returnDate,
      adults: String(criteria.travelers.adults),
      currencyCode: criteria.currency,
      max: process.env.AMADEUS_MAX_OFFERS ?? "10",
    });

    if (criteria.travelers.children > 0) params.set("children", String(criteria.travelers.children));
    if (criteria.travelers.infants > 0) params.set("infants", String(criteria.travelers.infants));

    const response = await fetchJson<{ data?: AmadeusFlightOffer[] }>(
      `${baseUrl}/v2/shopping/flight-offers?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return (response.data ?? []).map((offer) => {
      const outbound = summarizeItinerary(offer, 0);
      const inbound = summarizeItinerary(offer, 1);
      const operatingCarriers = Array.from(
        new Set(
          offer.itineraries
            ?.flatMap((itinerary) => itinerary.segments ?? [])
            .map((segment) => segment.carrierCode)
            .filter(Boolean) as string[],
        ),
      );

      return {
        id: `amadeus-${offer.id}`,
        providerId: "amadeus-flights",
        providerName: "Amadeus",
        providerOfferId: offer.id,
        mode: "flight",
        title: compactText(["Flight", outbound.summary]),
        outboundSummary: outbound.summary,
        inboundSummary: inbound.summary,
        durationMinutes: outbound.durationMinutes,
        inboundDurationMinutes: inbound.durationMinutes,
        stops: outbound.stops,
        inboundStops: inbound.stops,
        totalPrice: money(offer.price?.grandTotal, offer.price?.currency ?? criteria.currency),
        luggageIncluded: criteria.checkedLuggage,
        operatingCarriers,
        raw: offer,
      };
    });
  },
};
