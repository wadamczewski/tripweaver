import type { PackageOffer, TravelProvider, TripSearchCriteria } from "../../trip/types";
import { daysBetween, fetchJson, money, requiredEnv } from "../http";
import { requireIata } from "../locations";

type ApifyMoney = {
  amount?: number;
  currency?: string;
};

type ApifyPackageRecord = {
  recordType?: string;
  operator?: string;
  operatorLabel?: string;
  offerKey?: string;
  hotel?: {
    name?: string;
    category?: number;
    location?: { city?: string; region?: string };
    images?: string[];
  };
  travel?: { nights?: number };
  departureAirport?: { iata?: string };
  room?: { name?: string };
  board?: { name?: string };
  flight?: { baggage?: unknown } | null;
  transfer?: { included?: boolean | null } | null;
  cancellation?: unknown;
  price?: {
    total?: ApifyMoney;
    savingPercent?: number;
  };
};

const APIFY_BASE_URL = "https://api.apify.com/v2";
// Apify actor IDs use "~" instead of "/" in REST URLs.
const ACTOR_ID = "kamerozkan~dach-package-holiday-price-api";

// All 5 DACH tour operators this actor covers. Querying all of them
// maximizes real coverage/diversity per search; each successful
// per-operator search is billed separately (~$0.015 each) on Apify's
// pay-per-event pricing, so this is the main cost lever if usage needs
// trimming later.
const OPERATORS = ["tui", "dertour", "weg", "aidu", "alltours"];

const MAX_RESULTS_PER_OPERATOR = 20;

export const apifyDachPackagesProvider: TravelProvider<PackageOffer> = {
  id: "apify-dach-packages",
  name: "DACH Package Holidays (Apify)",
  kind: "package",
  async search(criteria: TripSearchCriteria) {
    const apiToken = requiredEnv("APIFY_API_TOKEN");
    const departureAirport = requireIata(criteria.origin);
    const nights = daysBetween(criteria.departureDate, criteria.returnDate);

    const records = await fetchJson<ApifyPackageRecord[]>(
      `${APIFY_BASE_URL}/acts/${ACTOR_ID}/run-sync-get-dataset-items`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: criteria.destination,
          startDate: criteria.departureDate,
          endDate: criteria.departureDate,
          nights,
          adults: criteria.travelers.adults,
          childAges: criteria.travelers.childAges,
          departureAirports: [departureAirport],
          operators: OPERATORS,
          maxResultsPerOperator: MAX_RESULTS_PER_OPERATOR,
        }),
      },
    );

    // The actor mixes real offer rows with a "run_diagnostic" summary
    // record (source health/error info, no real price/hotel data) in the
    // same array — verified live: a diagnostic record with
    // recordType:"run_diagnostic" came back with totalPrice 0 and
    // hotelName "Package stay" when this filter was missing. Real offers
    // are always recordType:"offer".
    return (records ?? [])
      .filter((record) => record.recordType === "offer")
      .map((record, index) => {
        const location = record.hotel?.location;
        const destination = location ? [location.city, location.region].filter(Boolean).join(", ") : undefined;

        return {
          id: `apify-dach-${record.operator ?? "unknown"}-${record.offerKey ?? index}`,
          providerId: "apify-dach-packages",
          providerName: "DACH Package Holidays (Apify)",
          providerOfferId: record.offerKey ?? String(index),
          // operatorLabel (e.g. "TUI Germany") is consistently present and
          // human-readable; the raw tourOperator code (e.g. "TJAX") is only
          // set for some operators (dertour) and not others (tui returns
          // null), so it's not usable as the primary display name.
          tourOperator: record.operatorLabel ?? record.operator ?? "Unknown operator",
          departureAirport: record.departureAirport?.iata,
          destination: destination ?? criteria.destination,
          hotelName: record.hotel?.name ?? "Package stay",
          hotelRating: record.hotel?.category,
          nights: record.travel?.nights,
          boardType: record.board?.name,
          roomType: record.room?.name,
          // record.flight?.baggage was null across every real record seen
          // during verification — leave undefined rather than guess true/false.
          luggageIncluded: record.flight?.baggage ? true : undefined,
          // transfer.included is a real boolean when the source confirms it,
          // but null when unconfirmed — keep that distinction (undefined) here
          // rather than picking a default; the rich adapter decides the
          // fallback.
          airportTransferIncluded: record.transfer?.included ?? undefined,
          totalPrice: money(record.price?.total?.amount, record.price?.total?.currency ?? criteria.currency),
          // cancellation was null across every real record seen during
          // verification (all 5 operators) — this actor doesn't surface it.
          cancellationPolicy: undefined,
          savingPercent: record.price?.savingPercent ?? undefined,
          imageUrl: record.hotel?.images?.[0],
          raw: record,
        };
      });
  },
};
