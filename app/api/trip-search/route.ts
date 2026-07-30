import { NextResponse } from "next/server";
import { searchTrip } from "../../../lib/search";
import type { TripSearchCriteria } from "../../../lib/trip/types";

export async function POST(request: Request) {
  const criteria = (await request.json()) as TripSearchCriteria;
  const results = await searchTrip(criteria);
  return NextResponse.json(results);
}
