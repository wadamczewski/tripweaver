import type { OptimizerWeights, PreferenceKey, SearchCriteria } from "../types";
import type { TripSearchCriteria, OptimizerWeights as RealOptimizerWeights } from "../trip/types";

export function toTripSearchCriteria(criteria: SearchCriteria): TripSearchCriteria {
  const childAges = criteria.travelers.travelers
    .filter((traveler) => traveler.type === "child")
    .map((traveler) => traveler.ageAtDeparture);

  const stars =
    criteria.accommodationStandard === "3-star"
      ? 3
      : criteria.accommodationStandard === "4-star"
        ? 4
        : criteria.accommodationStandard === "5-star"
          ? 5
          : undefined;

  return {
    origin: criteria.origin,
    destination: criteria.destination,
    departureDate: criteria.departureDate,
    returnDate: criteria.returnDate,
    travelers: {
      adults: criteria.travelers.adults,
      children: criteria.travelers.children,
      infants: criteria.travelers.infants,
      childAges
    },
    rooms: criteria.rooms.map((room) => ({
      adults: room.adults,
      childAges: room.childAges,
      infants: room.infantAges.length
    })),
    currency: criteria.currency,
    budget: criteria.budget?.amount,
    budgetMin: criteria.budgetMin?.amount,
    transportModes: criteria.selectedTransportModes,
    checkedLuggage: criteria.checkedLuggage,
    packageHolidays: criteria.packageHolidaysEnabled,
    accommodationStars: stars
  };
}

// Step 3's "Optimization priorities" checkboxes previously had no effect on
// anything past the search form component itself — never even reached
// toTripSearchCriteria, let alone the OptimizerPanel or the agent. Maps
// each selected preference onto the matching OptimizerWeights dimension so
// the checkboxes become the search's starting slider positions instead of
// always resetting to the same fixed default regardless of what was
// checked. allInclusive has no matching weight dimension (it's a
// board-type/package preference, not a ranking axis) and isn't mapped.
const PREFERENCE_TO_WEIGHT_KEY: Partial<Record<PreferenceKey, keyof OptimizerWeights>> = {
  cheapest: "price",
  shortest: "travelTime",
  fewestTransfers: "convenience",
  lowestCarbon: "sustainability",
  hotelQuality: "hotelQuality"
};

const PREFERENCE_WEIGHTS_BASE = 10;
const PREFERENCE_WEIGHTS_BOOST = 30;

export function weightsFromPreferences(preferences: PreferenceKey[]): OptimizerWeights {
  const weights: OptimizerWeights = {
    price: PREFERENCE_WEIGHTS_BASE,
    travelTime: PREFERENCE_WEIGHTS_BASE,
    convenience: PREFERENCE_WEIGHTS_BASE,
    hotelQuality: PREFERENCE_WEIGHTS_BASE,
    sustainability: PREFERENCE_WEIGHTS_BASE
  };

  for (const preference of preferences) {
    const key = PREFERENCE_TO_WEIGHT_KEY[preference];
    if (key) weights[key] += PREFERENCE_WEIGHTS_BOOST;
  }

  return weights;
}

// The rich UI's optimizer weights (price/travelTime/convenience/hotelQuality/sustainability,
// 0-100 ints set by sliders) don't line up one-to-one with the real backend agent's weights
// (price/speed/comfort/luggage/familyFit, 0-1 floats). This is a best-effort normalized mapping
// so the live agent review reflects roughly the same priorities the user set in the UI.
export function toRealWeights(weights: OptimizerWeights): RealOptimizerWeights {
  const total =
    weights.price + weights.travelTime + weights.convenience + weights.hotelQuality + weights.sustainability || 1;

  return {
    price: weights.price / total,
    speed: weights.travelTime / total,
    comfort: weights.hotelQuality / total,
    familyFit: weights.convenience / total,
    luggage: weights.sustainability / total
  };
}
