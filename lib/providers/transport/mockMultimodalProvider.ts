import { buildTravelerPrices, totalTravelerPrice } from "@/lib/providers/travelerMapping";
import { addPln, makeSegment, providerDelay, providerUrls, selectedModeAllowed } from "@/lib/providers/providerUtils";
import type { SearchCriteria, TransportOption, TransportProvider } from "@/lib/types";

export const mockMultimodalProvider: TransportProvider = {
  id: "mock-multimodal",
  name: "Mock Multimodal Adapter",
  async search(criteria) {
    await providerDelay(420);

    if (!selectedModeAllowed(criteria, ["flight", "train", "bus"])) {
      return [];
    }

    return [
      multimodal(criteria, {
        id: "multi-train-berlin-flight",
        label: "Train to Berlin + direct flight",
        positioning: "train",
        provider: "Rome2Rio-style demo route",
        airport: "Berlin Brandenburg",
        departure: `${criteria.departureDate}T05:42:00`,
        flightDeparture: `${criteria.departureDate}T09:35:00`,
        arrival: `${criteria.departureDate}T12:50:00`,
        duration: 428,
        transfers: 2,
        flightAdultPln: criteria.flexibleDates ? 760 : 840,
        positioningAdultPln: 118,
        luggagePln: 520,
        transferPln: 180,
        carbonKg: 730,
        notes: [
          "Saves PLN 1,240 compared with the fastest option while adding only 68 minutes.",
          "This airline charges passengers aged 12 and over the adult fare."
        ],
        badge: "Best Berlin value"
      }),
      multimodal(criteria, {
        id: "multi-bus-berlin-flight",
        label: "Night bus to Berlin + direct flight",
        positioning: "bus",
        provider: "Kiwi-style demo route",
        airport: "Berlin Brandenburg",
        departure: `${criteria.departureDate}T01:10:00`,
        flightDeparture: `${criteria.departureDate}T09:35:00`,
        arrival: `${criteria.departureDate}T12:50:00`,
        duration: 700,
        transfers: 2,
        flightAdultPln: 690,
        positioningAdultPln: 92,
        luggagePln: 520,
        transferPln: 180,
        carbonKg: 735,
        notes: ["Cheapest self-organized transport, but the night connection reduces convenience."],
        badge: "Cheapest transport"
      }),
      multimodal(criteria, {
        id: "multi-poznan-flight",
        label: "Bus to Poznan + one-stop flight",
        positioning: "bus",
        provider: "Skyscanner-style demo route",
        airport: "Poznan Lawica",
        departure: `${criteria.departureDate}T03:45:00`,
        flightDeparture: `${criteria.departureDate}T09:30:00`,
        arrival: `${criteria.departureDate}T15:20:00`,
        duration: 695,
        transfers: 3,
        flightAdultPln: 820,
        positioningAdultPln: 76,
        luggagePln: 360,
        transferPln: 170,
        carbonKg: 790,
        notes: ["Moving the trip two days later reduces the hotel cost by 14% in the optimizer scenario."]
      })
    ];
  }
};

function multimodal(criteria: SearchCriteria, options: {
  id: string;
  label: string;
  positioning: "train" | "bus";
  provider: string;
  airport: string;
  departure: string;
  flightDeparture: string;
  arrival: string;
  duration: number;
  transfers: number;
  flightAdultPln: number;
  positioningAdultPln: number;
  luggagePln: number;
  transferPln: number;
  carbonKg: number;
  notes: string[];
  badge?: string;
}): TransportOption {
  const airlinePrices = buildTravelerPrices(criteria, "airline", {
    adultBasePln: options.flightAdultPln,
    childFactor: 0.72,
    youthFactor: 1,
    infantNoSeatFeePln: 160,
    infantSeatFactor: 0.72,
    taxRate: 0.16,
    feePln: 42,
    currency: criteria.currency
  });
  const localPrices = buildTravelerPrices(criteria, options.positioning === "train" ? "rail" : "bus", {
    adultBasePln: options.positioningAdultPln,
    childFactor: options.positioning === "train" ? 0.5 : 0.75,
    youthFactor: 0.82,
    infantNoSeatFeePln: 0,
    infantSeatFactor: 0.5,
    taxRate: 0.08,
    feePln: 6,
    currency: criteria.currency
  });
  const travelerPrices = [...localPrices, ...airlinePrices];
  const basePrice = totalTravelerPrice(travelerPrices, criteria.currency);
  const luggagePrice = criteria.checkedLuggage ? addPln(options.luggagePln, criteria.currency) : addPln(0, criteria.currency);
  const transferPrice = addPln(options.transferPln, criteria.currency);

  return {
    id: options.id,
    label: options.label,
    provider: options.provider,
    modes: [options.positioning, "flight", "transfer"],
    origin: criteria.origin,
    destination: "Barcelona",
    departureTime: options.departure,
    arrivalTime: options.arrival,
    totalDurationMinutes: options.duration,
    transfers: options.transfers,
    segments: [
      makeSegment({
        id: `${options.id}-positioning`,
        mode: options.positioning,
        provider: options.positioning === "train" ? "PKP + DB demo" : "FlixBus demo",
        origin: criteria.origin,
        destination: options.airport,
        departureTime: options.departure,
        arrivalTime: options.flightDeparture,
        durationMinutes: options.positioning === "train" ? 196 : 265,
        pricePln: options.positioningAdultPln,
        currency: criteria.currency,
        luggageIncluded: true,
        bookingUrl: options.positioning === "train" ? providerUrls.rail : providerUrls.bus
      }),
      makeSegment({
        id: `${options.id}-flight`,
        mode: "flight",
        provider: "Airline demo fare",
        origin: options.airport,
        destination: "Barcelona El Prat",
        departureTime: options.flightDeparture,
        arrivalTime: options.arrival,
        durationMinutes: 170,
        transfers: options.transfers - 1,
        pricePln: options.flightAdultPln,
        currency: criteria.currency,
        luggageIncluded: false,
        bookingUrl: providerUrls.flights
      }),
      makeSegment({
        id: `${options.id}-transfer`,
        mode: "transfer",
        provider: "Barcelona Aerobus",
        origin: "BCN Airport",
        destination: "Hotel zone",
        departureTime: options.arrival,
        arrivalTime: options.arrival,
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
    savingBadge: options.badge
  };
}
