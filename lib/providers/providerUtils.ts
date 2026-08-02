import { addMoney, moneyFromPln } from "@/lib/currency";
import type {
  Currency,
  Money,
  SearchCriteria,
  TransportMode,
  TransportSegment,
  TravelerPrice
} from "@/lib/types";

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function providerDelay(base = 360): Promise<void> {
  return wait(base + Math.floor(Math.random() * 240));
}

export function makeSegment(options: {
  id: string;
  mode: TransportMode;
  provider: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  transfers?: number;
  pricePln: number;
  currency: Currency;
  luggageIncluded?: boolean;
  bookingUrl?: string;
}): TransportSegment {
  return {
    id: options.id,
    mode: options.mode,
    provider: options.provider,
    origin: options.origin,
    destination: options.destination,
    departureTime: options.departureTime,
    arrivalTime: options.arrivalTime,
    durationMinutes: options.durationMinutes,
    transfers: options.transfers ?? 0,
    price: moneyFromPln(options.pricePln, options.currency),
    luggageIncluded: options.luggageIncluded ?? false,
    bookingUrl: options.bookingUrl,
    direction: "outbound"
  };
}

export function addPln(amountPln: number, currency: Currency): Money {
  return moneyFromPln(amountPln, currency);
}

export function totalFromTravelerPrices(prices: TravelerPrice[], currency: Currency): Money {
  return addMoney(
    prices.flatMap((price) => [price.basePrice, price.taxes, price.fees]),
    currency
  );
}

export function selectedModeAllowed(criteria: SearchCriteria, modes: TransportMode[]): boolean {
  return modes.some((mode) => criteria.selectedTransportModes.includes(mode));
}

export function nightsBetween(criteria: SearchCriteria): number {
  const departure = new Date(criteria.departureDate);
  const arrival = new Date(criteria.returnDate);
  const days = Math.round((arrival.getTime() - departure.getTime()) / 86_400_000);
  return Math.max(1, days);
}

export const providerUrls = {
  flights: "https://example.com/provider/flights",
  rail: "https://example.com/provider/rail",
  bus: "https://example.com/provider/bus",
  booking: "https://example.com/provider/stays",
  packages: "https://example.com/provider/packages"
};
