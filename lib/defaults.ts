import type {
  OptimizerWeights,
  PreferenceKey,
  RoomOccupancy,
  SearchCriteria,
  Traveler,
  TravelerGroup,
  TransportMode
} from "@/lib/types";

export const DEFAULT_TRANSPORT_MODES: TransportMode[] = ["flight", "train", "bus", "transfer"];

export const DEFAULT_PREFERENCES: PreferenceKey[] = ["cheapest", "fewestTransfers", "hotelQuality"];

// Aligned to the optimizer panel's Low/Balanced/High tiers (10/25/40 — see
// OptimizerPanel.tsx) and to what weightsFromPreferences(DEFAULT_PREFERENCES)
// itself produces, so the very first render (before any search) already
// lands exactly on a tier instead of an approximate "nearest" match.
export const DEFAULT_WEIGHTS: OptimizerWeights = {
  price: 40,
  travelTime: 10,
  convenience: 40,
  hotelQuality: 40,
  sustainability: 10
};

export const DEFAULT_CHILD_AGES = [14];

export function createTravelerGroup(options: {
  adults: number;
  childAges: number[];
  infantAges: number[];
  infantSeats: boolean[];
  needsAdjacentSeats: boolean;
  needsAdjacentRooms: boolean;
}): TravelerGroup {
  const adults = Array.from({ length: options.adults }, (_, index): Traveler => {
    return {
      id: `adult-${index + 1}`,
      type: "adult",
      ageAtDeparture: 35
    };
  });

  const children = options.childAges.map((age, index): Traveler => {
    return {
      id: `child-${index + 1}`,
      type: "child",
      ageAtDeparture: age
    };
  });

  const infants = options.infantAges.map((age, index): Traveler => {
    return {
      id: `infant-${index + 1}`,
      type: "infant",
      ageAtDeparture: age,
      requiresSeparateSeat: options.infantSeats[index] ?? false
    };
  });

  const travelers = [...adults, ...children, ...infants];

  return {
    travelers,
    totalTravelers: travelers.length,
    adults: adults.length,
    children: children.length,
    infants: infants.length,
    seniors: 0,
    needsAdjacentSeats: options.needsAdjacentSeats,
    needsAdjacentRooms: options.needsAdjacentRooms
  };
}

export function createDefaultRooms(childAges = DEFAULT_CHILD_AGES, infantAges: number[] = []): RoomOccupancy[] {
  return [
    {
      roomId: "room-1",
      adults: 2,
      childAges,
      infantAges
    }
  ];
}

export const DEFAULT_SEARCH: SearchCriteria = {
  origin: "Szczecin",
  destination: "Barcelona",
  departureDate: "2026-09-12",
  returnDate: "2026-09-19",
  travelers: createTravelerGroup({
    adults: 2,
    childAges: DEFAULT_CHILD_AGES,
    infantAges: [],
    infantSeats: [],
    needsAdjacentSeats: true,
    needsAdjacentRooms: true
  }),
  rooms: createDefaultRooms(),
  // Budget was never actually enforced against search results until now
  // (see lib/search.ts's filterByBudget) — it was silently ignored, so this
  // 8000 default went unnoticed even though real converted totals for this
  // exact default route/family/4-star combo run 8,095-15,015 PLN. Widened
  // so the out-of-the-box demo search doesn't return zero results while
  // still meaningfully constraining (not maxed out at the slider's 20,000
  // ceiling, which would make the default demonstrate nothing).
  budget: {
    amount: 12000,
    currency: "PLN"
  },
  budgetMin: {
    amount: 4000,
    currency: "PLN"
  },
  flexibleDates: true,
  checkedLuggage: true,
  selectedTransportModes: DEFAULT_TRANSPORT_MODES,
  accommodationStandard: "4-star",
  packageHolidaysEnabled: true,
  currency: "PLN",
  preferences: DEFAULT_PREFERENCES
};

export function summarizeTravelers(group: TravelerGroup): string {
  const pieces = [`${group.adults} ${group.adults === 1 ? "adult" : "adults"}`];

  if (group.children > 0) {
    const ages = group.travelers
      .filter((traveler) => traveler.type === "child")
      .map((traveler) => traveler.ageAtDeparture)
      .join(", ");
    pieces.push(`${group.children} ${group.children === 1 ? "child" : "children"}, age${group.children > 1 ? "s" : ""} ${ages}`);
  }

  if (group.infants > 0) {
    const ages = group.travelers
      .filter((traveler) => traveler.type === "infant")
      .map((traveler) => traveler.ageAtDeparture)
      .join(", ");
    pieces.push(`${group.infants} ${group.infants === 1 ? "infant" : "infants"}, age${group.infants > 1 ? "s" : ""} ${ages}`);
  }

  return pieces.join(" · ");
}
