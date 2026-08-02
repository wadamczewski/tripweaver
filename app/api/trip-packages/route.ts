import { NextResponse } from "next/server";
import { searchPackageHolidays } from "../../../lib/search";
import type { TripSearchCriteria } from "../../../lib/trip/types";

export async function POST(request: Request) {
  const criteria = (await request.json()) as TripSearchCriteria;
  const results = await searchPackageHolidays(criteria);
  return NextResponse.json(results);
}
