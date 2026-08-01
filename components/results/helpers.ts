import type {
  AccommodationOption,
  Money,
  PackageHoliday,
  PriceBreakdown,
  ProviderTravelerCategory,
  RoomOccupancy,
  SearchResults,
  TransportMode,
  TransportOption,
  TransportSegment,
  TripOption
} from "@/lib/types";
import type { ProviderActionPayload, RecommendationBadge } from "./types";

export const DEFAULT_ESTIMATE_LABEL = "Demo estimate";

export const RESULTS_TABS = [
  { id: "complete", label: "Complete trips" },
  { id: "transport", label: "Transport" },
  { id: "accommodation", label: "Accommodation" },
  { id: "packages", label: "Package holidays" }
] as const;

const modeLabels: Record<TransportMode, string> = {
  flight: "Flight",
  train: "Train",
  bus: "Bus",
  car: "Car",
  ferry: "Ferry",
  transfer: "Transfer"
};

const travelerCategoryLabels: Record<ProviderTravelerCategory, string> = {
  INFANT_NO_SEAT: "Infant, no seat",
  INFANT_WITH_SEAT: "Infant with seat",
  CHILD: "Child",
  YOUTH: "Youth",
  ADULT: "Adult",
  SENIOR: "Senior"
};

export function formatMoney(money?: Money): string {
  if (!money) {
    return "Included";
  }

  const amount = Math.round(money.amount);
  return `${money.currency} ${new Intl.NumberFormat("en-US").format(amount)}`;
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "0 min";
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} min`;
  }

  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

export function formatClock(value: string): string {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(parsed));
}

export function formatDateTime(value: string): string {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(parsed));
}


export function formatMode(mode: TransportMode): string {
  return modeLabels[mode] ?? mode;
}

export function formatModes(modes: TransportMode[]): string {
  return modes.map(formatMode).join(" + ");
}

export function formatTravelerCategory(category: ProviderTravelerCategory): string {
  return travelerCategoryLabels[category] ?? category;
}

export function formatCarbon(kg: number): string {
  return `${Math.round(kg)} kg CO2e`;
}

export function getTravelerPriceTotal(price: PriceBreakdown["travelerPrices"][number]): Money {
  const discount = price.discount?.amount ?? 0;

  return {
    amount: price.basePrice.amount + price.taxes.amount + price.fees.amount - discount,
    currency: price.basePrice.currency
  };
}

export function getBreakdownRows(breakdown: PriceBreakdown) {
  return [
    { label: "Transport", value: breakdown.transport },
    { label: "Accommodation", value: breakdown.accommodation },
    { label: "Luggage", value: breakdown.luggage },
    { label: "Transfers", value: breakdown.transfers },
    { label: "Local transport", value: breakdown.localTransport },
    { label: "Food estimate", value: breakdown.food },
    { label: "Travel insurance", value: breakdown.insurance },
    { label: "Booking fees", value: breakdown.fees }
  ];
}

export function getRoomSummary(rooms: RoomOccupancy[]): string {
  if (rooms.length === 0) {
    return "Room allocation pending";
  }

  if (rooms.length === 1) {
    const room = rooms[0];
    const childCount = room.childAges.length;
    const infantCount = room.infantAges.length;
    const parts = [`${room.adults} adult${room.adults === 1 ? "" : "s"}`];

    if (childCount > 0) {
      parts.push(`${childCount} child${childCount === 1 ? "" : "ren"}`);
    }

    if (infantCount > 0) {
      parts.push(`${infantCount} infant${infantCount === 1 ? "" : "s"}`);
    }

    return `1 room: ${parts.join(", ")}`;
  }

  return `${rooms.length} rooms required`;
}

export function getTravelerGroupSummary(option: TripOption): string {
  const group = option.travelerGroup;
  const childAges = group.travelers
    .filter((traveler) => traveler.type === "child")
    .map((traveler) => traveler.ageAtDeparture);
  const infantAges = group.travelers
    .filter((traveler) => traveler.type === "infant")
    .map((traveler) => traveler.ageAtDeparture);

  const parts = [`${group.adults} adult${group.adults === 1 ? "" : "s"}`];

  if (childAges.length > 0) {
    parts.push(
      `${childAges.length} child${childAges.length === 1 ? "" : "ren"}, age${childAges.length === 1 ? "" : "s"} ${childAges.join(", ")}`
    );
  }

  if (infantAges.length > 0) {
    parts.push(
      `${infantAges.length} infant${infantAges.length === 1 ? "" : "s"}, age${infantAges.length === 1 ? "" : "s"} ${infantAges.join(", ")}`
    );
  }

  return parts.join(" | ");
}

export function getPrimaryTransportLabel(option: TripOption): string {
  if (option.transportOption) {
    return formatModes(option.transportOption.modes);
  }

  const modes = Array.from(new Set(option.transportSegments.map((segment) => segment.mode)));
  return modes.length > 0 ? modes.map(formatMode).join(" + ") : "Package transport";
}

export function getProviderLabel(option: TripOption): string {
  const providers = new Set<string>();

  option.transportSegments.forEach((segment) => providers.add(segment.provider));

  if (option.transportOption?.provider) {
    providers.add(option.transportOption.provider);
  }

  if (option.accommodation?.provider) {
    providers.add(option.accommodation.provider);
  }

  if (option.packageHoliday?.provider) {
    providers.add(option.packageHoliday.provider);
  }

  return Array.from(providers).slice(0, 3).join(", ");
}

export function getLuggageLabel(option: TripOption): string {
  if (option.packageHoliday?.luggageIncluded) {
    return "Checked luggage included";
  }

  if (option.transportOption?.luggageIncluded) {
    return "Checked luggage included";
  }

  const includedSegments = option.transportSegments.filter((segment) => segment.luggageIncluded).length;

  if (includedSegments === option.transportSegments.length && option.transportSegments.length > 0) {
    return "Luggage included on all segments";
  }

  if (includedSegments > 0) {
    return `Luggage included on ${includedSegments} segment${includedSegments === 1 ? "" : "s"}`;
  }

  return "Luggage priced separately";
}

export function buildRecommendationBadges(options: TripOption[]): Record<string, RecommendationBadge[]> {
  const badgesById: Record<string, RecommendationBadge[]> = {};

  options.forEach((option) => {
    badgesById[option.id] = [];
  });

  // options is already ordered by the Trip Optimizer agent's ranking
  // (see applyAgentRanking in lib/scoring.ts) — its top pick is options[0],
  // not necessarily the highest local score.
  const aiRecommended = options[0];
  const cheapest = [...options].sort((a, b) => a.totalPrice.amount - b.totalPrice.amount)[0];
  const fastest = [...options].sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes)[0];
  const packageHoliday = options.find((option) => option.kind === "package" || option.packageHoliday);

  if (aiRecommended) {
    badgesById[aiRecommended.id]?.push({
      id: "ai-recommended",
      label: "AI recommended",
      description: "Top pick from the Trip Optimizer agent's review of these results"
    });
  }

  if (cheapest) {
    badgesById[cheapest.id]?.push({
      id: "cheapest",
      label: "Cheapest",
      description: "Lowest estimated family total"
    });
  }

  if (fastest) {
    badgesById[fastest.id]?.push({
      id: "fastest",
      label: "Fastest",
      description: "Shortest door-to-door duration"
    });
  }

  if (packageHoliday) {
    badgesById[packageHoliday.id]?.push({
      id: "package-holiday",
      label: "Package holiday",
      description: "Operator bundle with stay and travel"
    });
  }

  return badgesById;
}

export function getRecommendationTiles(options: TripOption[]) {
  // options is already ordered by the Trip Optimizer agent's ranking
  // (see applyAgentRanking in lib/scoring.ts).
  const aiRecommended = options[0];
  const cheapest = [...options].sort((a, b) => a.totalPrice.amount - b.totalPrice.amount)[0];
  const fastest = [...options].sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes)[0];
  const packageHoliday = options.find((option) => option.kind === "package" || option.packageHoliday);

  return [
    {
      id: "ai-recommended",
      label: "AI recommended",
      option: aiRecommended,
      metric: aiRecommended ? `${aiRecommended.score}/100 score` : "Pending"
    },
    {
      id: "cheapest",
      label: "Cheapest",
      option: cheapest,
      metric: cheapest ? formatMoney(cheapest.totalPrice) : "Pending"
    },
    {
      id: "fastest",
      label: "Fastest",
      option: fastest,
      metric: fastest ? formatDuration(fastest.totalDurationMinutes) : "Pending"
    },
    {
      id: "package-holiday",
      label: "Package holiday",
      option: packageHoliday,
      metric: packageHoliday ? formatMoney(packageHoliday.totalPrice) : "Pending"
    }
  ];
}

export function getTripProviderActions(option: TripOption): ProviderActionPayload[] {
  const actions: ProviderActionPayload[] = [];

  if (option.transportOption?.bookingUrl) {
    actions.push({
      id: `${option.id}-transport`,
      kind: "transport",
      label: `Open ${option.transportOption.provider}`,
      provider: option.transportOption.provider,
      url: option.transportOption.bookingUrl,
      parentOptionId: option.id
    });
  }

  option.transportSegments.forEach((segment) => {
    if (!segment.bookingUrl) {
      return;
    }

    actions.push({
      id: segment.id,
      kind: "segment",
      label: `Open ${segment.provider}`,
      provider: segment.provider,
      url: segment.bookingUrl,
      parentOptionId: option.id
    });
  });

  if (option.accommodation.bookingUrl) {
    actions.push({
      id: `${option.id}-stay`,
      kind: "accommodation",
      label: `Open ${option.accommodation.provider}`,
      provider: option.accommodation.provider,
      url: option.accommodation.bookingUrl,
      parentOptionId: option.id
    });
  }

  if (option.packageHoliday?.bookingUrl) {
    actions.push({
      id: `${option.id}-package`,
      kind: "package",
      label: `Open ${option.packageHoliday.provider}`,
      provider: option.packageHoliday.provider,
      url: option.packageHoliday.bookingUrl,
      parentOptionId: option.id
    });
  }

  return dedupeActions(actions);
}

export function getTransportProviderAction(option: TransportOption): ProviderActionPayload | undefined {
  if (!option.bookingUrl) {
    return undefined;
  }

  return {
    id: option.id,
    kind: "transport",
    label: `Open ${option.provider}`,
    provider: option.provider,
    url: option.bookingUrl
  };
}

export function getAccommodationProviderAction(option: AccommodationOption): ProviderActionPayload | undefined {
  if (!option.bookingUrl) {
    return undefined;
  }

  return {
    id: option.id,
    kind: "accommodation",
    label: `Open ${option.provider}`,
    provider: option.provider,
    url: option.bookingUrl
  };
}

export function getPackageProviderAction(option: PackageHoliday): ProviderActionPayload | undefined {
  if (!option.bookingUrl) {
    return undefined;
  }

  return {
    id: option.id,
    kind: "package",
    label: `Open ${option.provider}`,
    provider: option.provider,
    url: option.bookingUrl
  };
}

export function getSegmentRoute(segment: TransportSegment): string {
  return `${segment.origin} to ${segment.destination}`;
}

export function getResultsCounts(results: SearchResults) {
  return {
    complete: results.tripOptions.length,
    transport: results.transportOptions.length,
    accommodation: results.accommodationOptions.length,
    packages: results.packageHolidays.length
  };
}

function dedupeActions(actions: ProviderActionPayload[]): ProviderActionPayload[] {
  const seen = new Set<string>();

  return actions.filter((action) => {
    const key = `${action.kind}-${action.provider}-${action.url}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

