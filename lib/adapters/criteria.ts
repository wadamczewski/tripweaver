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
// (price/speed/comfort/luggage/familyFit, 0-1 floats) — 3 pairs have a clean semantic match
// (price, travelTime->speed, hotelQuality->comfort), but the other two axes on each side don't:
// the UI has convenience (fewest transfers) and sustainability (carbon), the agent has luggage
// and familyFit, and none of those four line up with each other at all.
//
// This previously mapped sustainability -> luggage, which had zero logical connection (a user
// boosting "lowest carbon footprint" would make the agent think they cared about checked-luggage
// inclusion instead) — a real bug, not just an approximation, and part of why the agent's
// ranking looked like it was ignoring the weights and just sorting by price: with luggage fed a
// meaningless signal, price ended up carrying more real weight than intended. Fixed:
// - convenience -> familyFit: defensible, not just a leftover pairing — fewer transfers is
//   genuinely part of "lower friction for children", which is what familyFit means here.
// - luggage is driven by the actual "Checked luggage" toggle instead of by any slider, since
//   that's what the toggle is actually asking for.
// - sustainability has no real counterpart on the agent's side and is intentionally left out
//   of this mapping rather than forced onto an unrelated axis — it still drives the local
//   client-side score (lib/scoring.ts), just not the agent's ranking.
export function toRealWeights(weights: OptimizerWeights, checkedLuggage: boolean): RealOptimizerWeights {
  const mappedTotal = weights.price + weights.travelTime + weights.hotelQuality + weights.convenience || 1;
  const luggage = checkedLuggage ? 0.2 : 0.05;
  const remaining = 1 - luggage;

  return {
    price: (weights.price / mappedTotal) * remaining,
    speed: (weights.travelTime / mappedTotal) * remaining,
    comfort: (weights.hotelQuality / mappedTotal) * remaining,
    familyFit: (weights.convenience / mappedTotal) * remaining,
    luggage
  };
}
