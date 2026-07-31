import type { TripOption } from "@/lib/types";

const SAVED_TRIPS_KEY = "tripweaver.savedTrips.v1";

export function loadSavedTrips(): TripOption[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_TRIPS_KEY);
    return raw ? (JSON.parse(raw) as TripOption[]) : [];
  } catch {
    return [];
  }
}

export function persistSavedTrips(trips: TripOption[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(trips));
}

export function upsertSavedTrip(trips: TripOption[], trip: TripOption): TripOption[] {
  const withoutTrip = trips.filter((saved) => saved.id !== trip.id);
  return [trip, ...withoutTrip].slice(0, 12);
}

export function removeSavedTrip(trips: TripOption[], tripId: string): TripOption[] {
  return trips.filter((trip) => trip.id !== tripId);
}
