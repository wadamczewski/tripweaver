import type { TransportOffer, TravelProvider, TripSearchCriteria } from "../../trip/types";
import { money } from "../http";

const PLN_PER_UNIT: Record<string, number> = {
  PLN: 1,
  EUR: 1 / 4.35,
  USD: 1 / 3.95,
};

function fromPln(amountPln: number, currency: string) {
  const rate = PLN_PER_UNIT[currency] ?? 1;
  return amountPln * rate;
}

type DemoRoute = {
  suffix: string;
  mode: TransportOffer["mode"];
  title: string;
  durationMinutes: number;
  stops: number;
  pricePlnPerAdult: number;
  luggageIncluded: boolean;
  operatingCarriers?: string[];
};

const DEMO_ROUTES: DemoRoute[] = [
  {
    suffix: "direct-flight",
    mode: "flight",
    title: "Direct flight",
    durationMinutes: 165,
    stops: 0,
    pricePlnPerAdult: 780,
    luggageIncluded: true,
    operatingCarriers: ["Demo Air"],
  },
  {
    suffix: "connecting-flight",
    mode: "flight",
    title: "Connecting flight via Berlin",
    durationMinutes: 320,
    stops: 1,
    pricePlnPerAdult: 540,
    luggageIncluded: false,
    operatingCarriers: ["Demo Air", "Berlin Wings"],
  },
  {
    suffix: "multimodal-berlin",
    mode: "transfer",
    title: "Train to Berlin + flight",
    durationMinutes: 420,
    stops: 1,
    pricePlnPerAdult: 460,
    luggageIncluded: true,
    operatingCarriers: ["Demo Rail", "Berlin Wings"],
  },
  {
    suffix: "overnight-bus",
    mode: "bus",
    title: "Overnight bus + short flight",
    durationMinutes: 780,
    stops: 2,
    pricePlnPerAdult: 350,
    luggageIncluded: true,
    operatingCarriers: ["Demo Coach"],
  },
];

export const demoFlightsProvider: TravelProvider<TransportOffer> = {
  id: "tripweaver-demo-flights",
  name: "TripWeaver Demo Transport",
  kind: "transport",
  async search(criteria: TripSearchCriteria) {
    const travelerCount = criteria.travelers.adults + criteria.travelers.children + (criteria.travelers.infants ?? 0);

    return DEMO_ROUTES.map((route) => {
      const totalPln = route.pricePlnPerAdult * Math.max(1, travelerCount * 0.85);

      return {
        id: `demo-flight-${route.suffix}`,
        providerId: "tripweaver-demo-flights",
        providerName: "TripWeaver Demo Transport",
        providerOfferId: route.suffix,
        mode: route.mode,
        title: `${route.title}: ${criteria.origin} to ${criteria.destination}`,
        outboundSummary: `${criteria.origin} to ${criteria.destination}, ${route.stops === 0 ? "direct" : `${route.stops} stop${route.stops === 1 ? "" : "s"}`}`,
        inboundSummary: `${criteria.destination} to ${criteria.origin}, ${route.stops === 0 ? "direct" : `${route.stops} stop${route.stops === 1 ? "" : "s"}`}`,
        durationMinutes: route.durationMinutes,
        stops: route.stops,
        totalPrice: money(fromPln(totalPln, criteria.currency), criteria.currency),
        luggageIncluded: criteria.checkedLuggage ? route.luggageIncluded : false,
        operatingCarriers: route.operatingCarriers,
      } satisfies TransportOffer;
    });
  },
};
