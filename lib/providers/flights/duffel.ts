import type { TransportOffer, TravelProvider, TripSearchCriteria } from "../../trip/types";
import { compactText, fetchJson, money, optionalEnv, requiredEnv } from "../http";
import { requireIata } from "../locations";

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
    }>;
  }>;
};

type DuffelSlice = NonNullable<DuffelOffer["slices"]>[number];

type DuffelOfferRequestResponse = {
  data?: {
    offers?: DuffelOffer[];
  };
};

function passengers(criteria: TripSearchCriteria) {
  const adults = Array.from({ length: criteria.travelers.adults }, () => ({ type: "adult" }));
  const children = criteria.travelers.childAges.map((age) => ({ type: "child", age }));
  const infants = Array.from({ length: criteria.travelers.infants }, () => ({ type: "infant_without_seat" }));
  return [...adults, ...children, ...infants];
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

    return (response.data?.offers ?? []).slice(0, 10).map((offer) => {
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
        stops: outbound.stops,
        totalPrice: money(offer.total_amount, offer.total_currency ?? criteria.currency),
        luggageIncluded: criteria.checkedLuggage,
        operatingCarriers: carriers,
        raw: offer,
      };
    });
  },
};
