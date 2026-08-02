"use client";

import { useEffect, useState } from "react";
import { findNearestCity } from "./cityData";

// How long a cached browser geolocation fix is still trusted before a fresh
// one is requested — the user isn't going to have moved between cities in
// this window, so this avoids a slower fresh GPS/network fix on every load.
const MAX_POSITION_AGE_MS = 10 * 60 * 1000;
const POSITION_TIMEOUT_MS = 8000;

// Resolves to the CITY_DATABASE entry closest to the browser's actual
// location, once (if) the user grants permission. Stays null if geolocation
// isn't available, the user denies/ignores the permission prompt, or it
// times out — callers should treat null as "no opinion" and keep whatever
// default they already have, not as an error to surface.
export function useNearestCity(): string | null {
  const [cityName, setCityName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        const nearest = findNearestCity(position.coords.latitude, position.coords.longitude);
        if (nearest) setCityName(nearest.city);
      },
      () => {
        // Permission denied, unsupported, or timed out — silently keep the
        // existing default rather than blocking or erroring the search page
        // over an optional convenience feature.
      },
      { maximumAge: MAX_POSITION_AGE_MS, timeout: POSITION_TIMEOUT_MS }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return cityName;
}
