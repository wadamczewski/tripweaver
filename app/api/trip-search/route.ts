import { NextResponse } from "next/server";
import { searchTrip } from "../../../lib/search";
import type { OptimizerWeights, TripSearchCriteria } from "../../../lib/trip/types";

export async function POST(request: Request) {
  const { weights, ...criteria } = (await request.json()) as TripSearchCriteria & {
    weights?: OptimizerWeights;
  };
  const results = await searchTrip(criteria, weights);
  return NextResponse.json(results);
}
