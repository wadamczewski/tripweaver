import { buildTravelerPrices, totalTravelerPrice } from "@/lib/providers/travelerMapping";
import { addPln, makeSegment, providerDelay, providerUrls, selectedModeAllowed } from "@/lib/providers/providerUtils";
import type { SearchCriteria, TransportOption, TransportProvider } from "@/lib/types";

export const mockBusProvider: TransportProvider = {
  id: "mock-bus",
  name: "Mock Bus Adapter",
  async search(criteria) {
    await providerDelay(260);

    if (!selectedModeAllowed(criteria, ["bus"])) {
      return [];
    }

    return [
      bus(criteria, {
        id: "bus-berlin-night",
        label: "Night bus to Berlin airport",
        provider: "FlixBus-style demo feed",
        destination: "Berlin Brandenburg",
        departure: `${criteria.departureDate}T01:10:00`,
        arrival: `${criteria.departureDate}T05:35:00`,
        duration: 265,
        adultBasePln: 92,
        carbonKg: 44,
        notes: ["Bus provider charges age 14 as adult in this demo."]
      }),
      bus(criteria, {
        id: "bus-poznan-low",
        label: "Budget bus to Poznan airport",
        provider: "Omio-style demo feed",
        destination: "Poznan Lawica",
        departure: `${criteria.departureDate}T03:45:00`,
        arrival: `${criteria.departureDate}T07:35:00`,
        duration: 230,
        adultBasePln: 76,
        carbonKg: 39,
        notes: ["Lowest positioning cost, but an early departure reduces convenience."]
      })
    ];
  }
};

function bus(criteria: SearchCriteria, options: {
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
  const travelerPrices = buildTravelerPrices(criteria, "bus", {
    adultBasePln: options.adultBasePln,
    childFactor: 0.75,
    youthFactor: 1,
    infantNoSeatFeePln: 0,
    infantSeatFactor: 0.75,
    taxRate: 0.08,
    feePln: 5,
    currency: criteria.currency
  });
  const basePrice = totalTravelerPrice(travelerPrices, criteria.currency);

  return {
    id: options.id,
    label: options.label,
    provider: options.provider,
    modes: ["bus"],
    origin: criteria.origin,
    destination: options.destination,
    departureTime: options.departure,
    arrivalTime: options.arrival,
    totalDurationMinutes: options.duration,
    transfers: 0,
    segments: [
      makeSegment({
        id: `${options.id}-segment`,
        mode: "bus",
        provider: options.provider,
        origin: criteria.origin,
        destination: options.destination,
        departureTime: options.departure,
        arrivalTime: options.arrival,
        durationMinutes: options.duration,
        pricePln: options.adultBasePln,
        currency: criteria.currency,
        luggageIncluded: true,
        bookingUrl: providerUrls.bus
      })
    ],
    travelerPrices,
    basePrice,
    luggagePrice: addPln(0, criteria.currency),
    transferPrice: addPln(0, criteria.currency),
    totalPrice: basePrice,
    luggageIncluded: true,
    carbonKg: options.carbonKg,
    bookingUrl: providerUrls.bus,
    providerNotes: options.notes
  };
}
