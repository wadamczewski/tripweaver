import type { TransportOffer, TravelProvider, TripSearchCriteria } from "../../trip/types";
import { compactText, fetchJson, money, optionalEnv, requiredEnv } from "../http";
import { requireIata } from "../locations";

type DuffelBaggage = {
  type?: string;
  quantity?: number;
};

type DuffelSegmentPassenger = {
  baggages?: DuffelBaggage[];
};

type DuffelOffer = {
  id: string;
  total_amount?: string;
  total_currency?: string;
  owner?: { name?: string };
  slices?: Array<{
    duration?: string;
    origin?: { iata_code?: string };
    destination?: { iata_code?: string };
    segments?: Array<{
      operating_carrier?: { name?: string; iata_code?: string };
      passengers?: DuffelSegmentPassenger[];
    }>;
  }>;
};

type DuffelSlice = NonNullable<DuffelOffer["slices"]>[number];

type DuffelOfferRequestResponse = {
  data?: {
    offers?: DuffelOffer[];
  };
};

function parseDurationMinutes(duration?: string) {
  if (!duration) return undefined;
  const hours = duration.match(/(\d+)H/)?.[1];
  const minutes = duration.match(/(\d+)M/)?.[1];
  return Number(hours ?? 0) * 60 + Number(minutes ?? 0);
}

function passengers(criteria: TripSearchCriteria) {
  const adults = Array.from({ length: criteria.travelers.adults }, () => ({ type: "adult" }));
  const children = criteria.travelers.childAges.map((age) => ({ age }));
  const infants = Array.from({ length: criteria.travelers.infants }, () => ({ type: "infant_without_seat" }));
  return [...adults, ...children, ...infants];
}

// Duffel returns real per-passenger baggage allowances on every segment
// (segment.passengers[].baggages, e.g. [{type:"checked",quantity:1}]) — use
// that instead of assuming the search toggle describes the fare's actual
// policy. Checks only the first slice/segment/passenger since baggage
// allowance is consistent across a single cabin-class booking.
function hasCheckedBaggage(offer: DuffelOffer): boolean {
  const baggages = offer.slices?.[0]?.segments?.[0]?.passengers?.[0]?.baggages ?? [];
  return baggages.some((bag) => bag.type === "checked" && (bag.quantity ?? 0) > 0);
}

function sliceSummary(slice?: DuffelSlice) {
  const stops = Math.max((slice?.segments?.length ?? 1) - 1, 0);
  return {
    summary: compactText([
      slice?.origin?.iata_code && slice?.destination?.iata_code
        ? `${slice.origin.iata_code} to ${slice.destination.iata_code}`
        : undefined,
      stops === 0 ? "direct" : `${stops} stop${stops === 1 ? "" : "s"}`,
    ]),
    stops,
  };
}

export const duffelFlightsProvider: TravelProvider<TransportOffer> = {
  id: "duffel-flights",
  name: "Duffel",
  kind: "transport",
  async search(criteria: TripSearchCriteria) {
    const baseUrl = optionalEnv("DUFFEL_BASE_URL", "https://api.duffel.com");
    const token = requiredEnv("DUFFEL_ACCESS_TOKEN");
    const origin = requireIata(criteria.origin);
    const destination = requireIata(criteria.destination);

    const response = await fetchJson<DuffelOfferRequestResponse>(`${baseUrl}/air/offer_requests`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Duffel-Version": optionalEnv("DUFFEL_VERSION", "v2"),
      },
      body: JSON.stringify({
        data: {
          slices: [
            { origin, destination, departure_date: criteria.departureDate },
            { origin: destination, destination: origin, departure_date: criteria.returnDate },
          ],
          passengers: passengers(criteria),
          cabin_class: "economy",
        },
      }),
    });

    // Duffel already returns a bounded set per call (typically dozens, not
    // thousands) — no need to truncate further here. The results list and
    // trip-combo generation handle the volume (infinite scroll / a capped
    // cross-product), not this adapter.
    return (response.data?.offers ?? []).map((offer) => {
      const outbound = sliceSummary(offer.slices?.[0]);
      const inbound = sliceSummary(offer.slices?.[1]);
      const carriers = Array.from(
        new Set(
          offer.slices
            ?.flatMap((slice) => slice.segments ?? [])
            .map((segment) => segment.operating_carrier?.name || segment.operating_carrier?.iata_code)
            .filter(Boolean) as string[],
        ),
      );

      return {
        id: `duffel-${offer.id}`,
        providerId: "duffel-flights",
        providerName: "Duffel",
        providerOfferId: offer.id,
        mode: "flight",
        title: compactText([offer.owner?.name, outbound.summary]),
        outboundSummary: outbound.summary,
        inboundSummary: inbound.summary,
        durationMinutes: parseDurationMinutes(offer.slices?.[0]?.duration),
        stops: outbound.stops,
        totalPrice: money(offer.total_amount, offer.total_currency ?? criteria.currency),
        luggageIncluded: hasCheckedBaggage(offer),
        operatingCarriers: carriers,
        raw: offer,
      };
    });
  },
};
