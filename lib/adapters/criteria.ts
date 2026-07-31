import type { SearchCriteria, OptimizerWeights } from "../types";
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
    transportModes: criteria.selectedTransportModes,
    checkedLuggage: criteria.checkedLuggage,
    packageHolidays: criteria.packageHolidaysEnabled,
    accommodationStars: stars
  };
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
