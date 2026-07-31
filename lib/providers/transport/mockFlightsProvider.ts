import { buildTravelerPrices, totalTravelerPrice } from "@/lib/providers/travelerMapping";
import { addPln, makeSegment, providerDelay, providerUrls, selectedModeAllowed } from "@/lib/providers/providerUtils";
import type { SearchCriteria, TransportOption, TransportProvider } from "@/lib/types";

function flightOption(criteria: SearchCriteria, options: {
  id: string;
  label: string;
  provider: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  transfers: number;
  adultBasePln: number;
  luggagePln: number;
  transferPln: number;
  carbonKg: number;
  notes: string[];
  savingBadge?: string;
}): TransportOption {
  const travelerPrices = buildTravelerPrices(criteria, "airline", {
    adultBasePln: options.adultBasePln,
    childFactor: 0.72,
    youthFactor: 1,
    infantNoSeatFeePln: 160,
    infantSeatFactor: 0.72,
    taxRate: 0.16,
    feePln: 42,
    currency: criteria.currency
  });
  const basePrice = totalTravelerPrice(travelerPrices, criteria.currency);
  const luggagePrice = criteria.checkedLuggage ? addPln(options.luggagePln, criteria.currency) : addPln(0, criteria.currency);
  const transferPrice = addPln(options.transferPln, criteria.currency);

  return {
    id: options.id,
    label: options.label,
    provider: options.provider,
    modes: ["flight", "transfer"],
    origin: options.origin,
    destination: options.destination,
    departureTime: options.departureTime,
    arrivalTime: options.arrivalTime,
    totalDurationMinutes: options.duration,
    transfers: options.transfers,
    segments: [
      makeSegment({
        id: `${options.id}-flight`,
        mode: "flight",
        provider: options.provider,
        origin: options.origin,
        destination: options.destination,
        departureTime: options.departureTime,
        arrivalTime: options.arrivalTime,
        durationMinutes: Math.max(150, options.duration - 75),
        transfers: options.transfers,
        pricePln: options.adultBasePln,
        currency: criteria.currency,
        luggageIncluded: false,
        bookingUrl: providerUrls.flights
      }),
      makeSegment({
        id: `${options.id}-transfer`,
        mode: "transfer",
        provider: "Barcelona Aerobus",
        origin: "BCN Airport",
        destination: "Barcelona hotel zone",
        departureTime: options.arrivalTime,
        arrivalTime: options.arrivalTime,
        durationMinutes: 35,
        pricePln: options.transferPln,
        currency: criteria.currency,
        luggageIncluded: true,
        bookingUrl: providerUrls.flights
      })
    ],
    travelerPrices,
    basePrice,
    luggagePrice,
    transferPrice,
    totalPrice: {
      amount: basePrice.amount + luggagePrice.amount + transferPrice.amount,
      currency: criteria.currency
    },
    luggageIncluded: false,
    carbonKg: options.carbonKg,
    bookingUrl: providerUrls.flights,
    providerNotes: options.notes,
    savingBadge: options.savingBadge
  };
}

export const mockFlightsProvider: TransportProvider = {
  id: "mock-flights",
  name: "Mock Flights Adapter",
  async search(criteria) {
    await providerDelay();

    if (!selectedModeAllowed(criteria, ["flight"])) {
      return [];
    }

    return [
      flightOption(criteria, {
        id: "flight-ber-wizz",
        label: "Berlin direct flight",
        provider: "Wizz Air demo feed",
        origin: "Berlin Brandenburg",
        destination: "Barcelona El Prat",
        departureTime: `${criteria.departureDate}T09:35:00`,
        arrivalTime: `${criteria.departureDate}T12:15:00`,
        duration: 420,
        transfers: 1,
        adultBasePln: criteria.flexibleDates ? 760 : 840,
        luggagePln: 520,
        transferPln: 180,
        carbonKg: 690,
        notes: [
          "This airline charges passengers aged 12 and over the adult fare.",
          "Departing from Berlin saves approximately PLN 860 compared with Warsaw."
        ],
        savingBadge: "Berlin departure saves PLN 860"
      }),
      flightOption(criteria, {
        id: "flight-poznan-lot",
        label: "Poznan connection via Munich",
        provider: "Amadeus-style demo feed",
        origin: "Poznan Lawica",
        destination: "Barcelona El Prat",
        departureTime: `${criteria.departureDate}T06:50:00`,
        arrivalTime: `${criteria.departureDate}T12:55:00`,
        duration: 515,
        transfers: 1,
        adultBasePln: 980,
        luggagePln: 360,
        transferPln: 160,
        carbonKg: 760,
        notes: ["Checked luggage is priced per adult ticket in this mock fare."]
      }),
      flightOption(criteria, {
        id: "flight-waw-fast",
        label: "Warsaw fastest flight",
        provider: "Google Flights-style demo feed",
        origin: "Warsaw Chopin",
        destination: "Barcelona El Prat",
        departureTime: `${criteria.departureDate}T13:20:00`,
        arrivalTime: `${criteria.departureDate}T16:25:00`,
        duration: 360,
        transfers: 0,
        adultBasePln: 1390,
        luggagePln: 420,
        transferPln: 190,
        carbonKg: 810,
        notes: ["Fastest option, but the family fare is materially higher."]
      })
    ];
  }
};
