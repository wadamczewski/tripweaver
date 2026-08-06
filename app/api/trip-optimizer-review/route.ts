import { NextResponse } from "next/server";
import { reviewTripOptionsWithAgent } from "../../../lib/optimizer/agent-review";
import type {
  OptimizerReviewTripOption,
  OptimizerWeights,
  PackageOffer,
  TripSearchCriteria,
} from "../../../lib/trip/types";

type OptimizerReviewRequest = {
  criteria: TripSearchCriteria;
  tripOptions: OptimizerReviewTripOption[];
  packageOptions?: PackageOffer[];
  weights: OptimizerWeights;
  changeReason?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as OptimizerReviewRequest;
  const review = await reviewTripOptionsWithAgent({
    criteria: body.criteria,
    tripOptions: body.tripOptions,
    packageOptions: body.packageOptions,
    weights: body.weights,
    changeReason: body.changeReason ?? "Trip Optimizer settings changed",
  });

  return NextResponse.json(review);
}
