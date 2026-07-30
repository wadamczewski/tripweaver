import { NextResponse } from "next/server";
import { reviewTripOptionsWithAgent } from "../../../lib/optimizer/agent-review";
import type {
  AccommodationOffer,
  OptimizerWeights,
  TransportOffer,
  TripOption,
  TripSearchCriteria,
} from "../../../lib/trip/types";

type OptimizerReviewRequest = {
  criteria: TripSearchCriteria;
  transportOptions: TransportOffer[];
  accommodationOptions: AccommodationOffer[];
  tripOptions: TripOption[];
  weights: OptimizerWeights;
  changeReason?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as OptimizerReviewRequest;
  const review = await reviewTripOptionsWithAgent({
    criteria: body.criteria,
    transportOptions: body.transportOptions,
    accommodationOptions: body.accommodationOptions,
    tripOptions: body.tripOptions,
    weights: body.weights,
    changeReason: body.changeReason ?? "Trip Optimizer settings changed",
  });

  return NextResponse.json(review);
}
