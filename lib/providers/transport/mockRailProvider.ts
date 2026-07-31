import { buildTravelerPrices, totalTravelerPrice } from "@/lib/providers/travelerMapping";
import { addPln, makeSegment, providerDelay, providerUrls, selectedModeAllowed } from "@/lib/providers/providerUtils";
import type { SearchCriteria, TransportOption, TransportProvider } from "@/lib/types";

export const mockRailProvider: TransportProvider = {
  id: "mock-rail",
  name: "Mock Rail Adapter",
  async search(criteria) {
    await providerDelay(280);

    if (!selectedModeAllowed(criteria, ["train"])) {
      return [];
    }

    return [
      rail(criteria, {
        id: "rail-szczecin-berlin",
        label: "Regional train to Berlin airport",
        provider: "PKP + Deutsche Bahn demo",
        destination: "Berlin Brandenburg",
        departure: `${criteria.departureDate}T05:42:00`,
        arrival: `${criteria.departureDate}T08:58:00`,
        duration: 196,
        adultBasePln: 118,
        carbonKg: 38,
        notes: ["Train child discounts apply below age 15 in this demo."]
      }),
      rail(criteria, {
        id: "rail-warsaw-positioning",
        label: "Intercity train to Warsaw airport",
        provider: "PKP Intercity demo",
        destination: "Warsaw Chopin",
        departure: `${criteria.departureDate}T05:12:00`,
        arrival: `${criteria.departureDate}T10:05:00`,
        duration: 293,
        adultBasePln: 168,
        carbonKg: 56,
        notes: ["Teenagers aged 15 and above would map to youth fare for rail."]
      })
    ];
  }
};

function rail(criteria: SearchCriteria, options: {
  id: string;
  label: string;
  provider: string;
  destination: string;
  departure: string;
  arrival: string;
  duration: number;
  adultBasePln: number;
  carbonKg: number;
  notes: string[];
}): TransportOption {
  const travelerPrices = buildTravelerPrices(criteria, "rail", {
    adultBasePln: options.adultBasePln,
    childFactor: 0.5,
    youthFactor: 0.82,
    infantNoSeatFeePln: 0,
    infantSeatFactor: 0.5,
    taxRate: 0.08,
    feePln: 8,
    currency: criteria.currency
  });
  const basePrice = totalTravelerPrice(travelerPrices, criteria.currency);
  const luggagePrice = addPln(0, criteria.currency);
  const transferPrice = addPln(0, criteria.currency);

  return {
    id: options.id,
    label: options.label,
    provider: options.provider,
    modes: ["train"],
    origin: criteria.origin,
    destination: options.destination,
    departureTime: options.departure,
    arrivalTime: options.arrival,
    totalDurationMinutes: options.duration,
    transfers: 0,
    segments: [
      makeSegment({
        id: `${options.id}-segment`,
        mode: "train",
        provider: options.provider,
        origin: criteria.origin,
        destination: options.destination,
        departureTime: options.departure,
        arrivalTime: options.arrival,
        durationMinutes: options.duration,
        pricePln: options.adultBasePln,
        currency: criteria.currency,
        luggageIncluded: true,
        bookingUrl: providerUrls.rail
      })
    ],
    travelerPrices,
    basePrice,
    luggagePrice,
    transferPrice,
    totalPrice: basePrice,
    luggageIncluded: true,
    carbonKg: options.carbonKg,
    bookingUrl: providerUrls.rail,
    providerNotes: options.notes
  };
}
