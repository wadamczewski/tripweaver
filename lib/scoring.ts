import type { OptimizerWeights, TripOption } from "./types";

function range(values: number[]) {
  return { min: Math.min(...values), max: Math.max(...values) };
}

function inverseScore(value: number, bounds: { min: number; max: number }) {
  if (bounds.max === bounds.min) return 100;
  return Math.round(100 - ((value - bounds.min) / (bounds.max - bounds.min)) * 100);
}

function directScore(value: number, bounds: { min: number; max: number }) {
  if (bounds.max === bounds.min) return 100;
  return Math.round(((value - bounds.min) / (bounds.max - bounds.min)) * 100);
}

function explainScore(
  trip: TripOption,
  parts: {
    priceScore: number;
    timeScore: number;
    convenienceScore: number;
    hotelScore: number;
    carbonScore: number;
    weights: OptimizerWeights;
  }
): string {
  const strongest = Object.entries({
    price: parts.priceScore * parts.weights.price,
    time: parts.timeScore * parts.weights.travelTime,
    convenience: parts.convenienceScore * parts.weights.convenience,
    hotel: parts.hotelScore * parts.weights.hotelQuality,
    carbon: parts.carbonScore * parts.weights.sustainability
  }).sort((a, b) => b[1] - a[1])[0]?.[0];

  const labels: Record<string, string> = {
    price: "Strong price relative to the other results",
    time: "Fast door-to-door travel time",
    convenience: "Fewer transfers than the alternatives",
    hotel: "Higher-rated accommodation",
    carbon: "Lower estimated carbon footprint"
  };

  const weakest = Object.entries({
    price: parts.priceScore,
    time: parts.timeScore,
    convenience: parts.convenienceScore,
    hotel: parts.hotelScore,
    carbon: parts.carbonScore
  }).sort((a, b) => a[1] - b[1])[0]?.[0];

  const drawbacks: Record<string, string> = {
    price: "a higher total price pulled the score down",
    time: "a longer travel time pulled the score down",
    convenience: "additional transfers reduced the convenience score",
    hotel: "a lower-rated stay reduced the score",
    carbon: "a higher estimated carbon footprint reduced the score"
  };

  return `${labels[strongest ?? "price"]}. ${drawbacks[weakest ?? "price"] ?? ""}`.trim();
}

export function scoreTripOptions(trips: TripOption[], weights: OptimizerWeights): TripOption[] {
  if (trips.length === 0) {
    return [];
  }

  const priceRange = range(trips.map((trip) => trip.totalPrice.amount));
  const timeRange = range(trips.map((trip) => trip.totalDurationMinutes));
  const transferRange = range(trips.map((trip) => trip.transfers));
  const hotelRange = range(trips.map((trip) => trip.accommodation.rating));
  const carbonRange = range(trips.map((trip) => trip.carbonKg));
  const totalWeight =
    weights.price + weights.travelTime + weights.convenience + weights.hotelQuality + weights.sustainability || 1;

  return trips
    .map((trip) => {
      const priceScore = inverseScore(trip.totalPrice.amount, priceRange);
      const timeScore = inverseScore(trip.totalDurationMinutes, timeRange);
      const convenienceScore = inverseScore(trip.transfers, transferRange);
      const hotelScore = directScore(trip.accommodation.rating, hotelRange);
      const carbonScore = inverseScore(trip.carbonKg, carbonRange);
      const score = Math.round(
        (priceScore * weights.price +
          timeScore * weights.travelTime +
          convenienceScore * weights.convenience +
          hotelScore * weights.hotelQuality +
          carbonScore * weights.sustainability) /
          totalWeight
      );

      return {
        ...trip,
        score,
        scoreExplanation: explainScore(trip, {
          priceScore,
          timeScore,
          convenienceScore,
          hotelScore,
          carbonScore,
          weights
        })
      };
    })
    .sort((left, right) => right.score - left.score);
}
