"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Compass,
  Loader2
} from "lucide-react";
import { SearchPanel } from "@/components/search/SearchPanel";
import { OptimizerPanel } from "@/components/optimizer/OptimizerPanel";
import { TripSummaryRail } from "@/components/optimizer/TripSummaryRail";
import { ResultsTabs } from "@/components/results/ResultsTabs";
import { OptimizerAgentReview } from "@/components/optimizer/OptimizerAgentReview";
import { DEFAULT_SEARCH, DEFAULT_WEIGHTS } from "@/lib/defaults";
import { scoreTripOptions } from "@/lib/scoring";
import { toTripSearchCriteria, toRealWeights } from "@/lib/adapters/criteria";
import { toSearchResults } from "@/lib/adapters/results";
import {
  loadSavedTrips,
  persistSavedTrips,
  removeSavedTrip,
  upsertSavedTrip
} from "@/lib/storage";
import type { OptimizerWeights, SearchCriteria, SearchResults, TripOption } from "@/lib/types";
import type { TripSearchResults } from "@/lib/trip/types";
import { validateSearchCriteria } from "@/lib/validation";

type SearchState = "idle" | "loading" | "ready" | "error";

const DESTINATION_IMAGES: Array<{ keys: string[]; url: string }> = [
  {
    keys: ["barcelona", "spain", "catalonia"],
    url: "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=2200&q=85"
  },
  {
    keys: ["paris", "france"],
    url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=2200&q=85"
  },
  {
    keys: ["rome", "italy"],
    url: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=2200&q=85"
  },
  {
    keys: ["london", "england", "uk", "united kingdom"],
    url: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=2200&q=85"
  },
  {
    keys: ["berlin", "germany"],
    url: "https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=2200&q=85"
  },
  {
    keys: ["lisbon", "portugal"],
    url: "https://images.unsplash.com/photo-1500759285222-a95626b934cb?auto=format&fit=crop&w=2200&q=85"
  }
];

function getDestinationImage(destination: string): string {
  const normalizedDestination = destination.trim().toLowerCase();
  const match = DESTINATION_IMAGES.find((image) =>
    image.keys.some((key) => normalizedDestination.includes(key))
  );

  return match?.url ?? "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2200&q=85";
}

export default function Home() {
  const [criteria, setCriteria] = useState<SearchCriteria>(DEFAULT_SEARCH);
  const [weights, setWeights] = useState<OptimizerWeights>(DEFAULT_WEIGHTS);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [realResults, setRealResults] = useState<TripSearchResults | null>(null);
  const [status, setStatus] = useState<SearchState>("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [savedTrips, setSavedTrips] = useState<TripOption[]>([]);

  useEffect(() => {
    setSavedTrips(loadSavedTrips());
  }, []);

  const scoredResults = useMemo(() => {
    if (!results) {
      return null;
    }

    return {
      ...results,
      tripOptions: scoreTripOptions(results.tripOptions, weights)
    };
  }, [results, weights]);

  const featuredTrip = scoredResults?.tripOptions[0];
  const comparedTrips = scoredResults?.tripOptions.filter((trip) => compareIds.includes(trip.id)) ?? [];
  const destinationImage = useMemo(() => getDestinationImage(criteria.destination), [criteria.destination]);

  async function handleSearch(nextCriteria: SearchCriteria) {
    const validationErrors = validateSearchCriteria(nextCriteria);
    setCriteria(nextCriteria);
    setErrors(validationErrors);

    if (validationErrors.length > 0) {
      setStatus("idle");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/trip-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toTripSearchCriteria(nextCriteria))
      });

      if (!response.ok) {
        throw new Error("Trip search request failed");
      }

      const nextRealResults = (await response.json()) as TripSearchResults;
      const image = getDestinationImage(nextCriteria.destination);
      const nextResults = toSearchResults(nextCriteria, image, nextRealResults);

      setRealResults(nextRealResults);
      setResults(nextResults);
      setStatus("ready");
      setCompareIds(nextResults.tripOptions.slice(0, 2).map((trip) => trip.id));
    } catch {
      setStatus("error");
      setErrors([
        "TripWeaver could not reach the provider adapters. Confirm the API keys in .env.local and try again."
      ]);
    }
  }

  function handleCompare(tripId: string) {
    setCompareIds((current) => {
      if (current.includes(tripId)) {
        return current.filter((id) => id !== tripId);
      }

      if (current.length >= 3) {
        return [...current.slice(1), tripId];
      }

      return [...current, tripId];
    });
  }

  function handleSave(trip: TripOption) {
    setSavedTrips((current) => {
      const next = upsertSavedTrip(current, trip);
      persistSavedTrips(next);
      return next;
    });
  }

  function handleRemoveSaved(tripId: string) {
    setSavedTrips((current) => {
      const next = removeSavedTrip(current, tripId);
      persistSavedTrips(next);
      return next;
    });
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f0e6]">
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1800&q=80"
            alt=""
            className="h-full w-full object-cover opacity-38"
          />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(16,32,51,0.96)_0%,rgba(16,32,51,0.82)_46%,rgba(16,32,51,0.42)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f6f0e6] to-transparent" />
        </div>

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ink shadow-soft">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-semibold tracking-tight">TripWeaver</p>
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-9 pt-2 sm:px-6 lg:px-8">
          <div className="max-w-6xl">
            <h1 className="max-w-6xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Build the whole trip, one decision at a time.
            </h1>
            <p className="mt-4 max-w-5xl text-base leading-7 text-white/70 sm:text-lg">
              TripWeaver guides families from route and rooms to budget, packages, and total trip value.
            </p>
          </div>

          <div className="mt-6">
            <SearchPanel
              criteria={criteria}
              errors={errors}
              isLoading={status === "loading"}
              onChange={setCriteria}
              onSubmit={handleSearch}
            />
          </div>
        </div>
      </section>

      <section className={`relative overflow-hidden px-4 py-10 sm:px-6 lg:px-8 ${status === "ready" ? "min-h-screen bg-ink" : ""}`}>
        {status === "ready" ? (
          <div className="absolute inset-0">
            <img src={destinationImage} alt="" className="h-full w-full object-cover opacity-72" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,32,51,0.92)_0%,rgba(16,32,51,0.66)_36%,rgba(16,32,51,0.86)_100%)]" />
          </div>
        ) : null}

        <div className="relative z-10 mx-auto max-w-7xl">
          {status === "idle" && (
            <div className="grid gap-4 rounded-[30px] border border-line bg-white/80 p-5 shadow-soft backdrop-blur md:grid-cols-2 md:p-6">
            {[
              ["Berlin airport savings", "Compare Polish and German departures for the same family."],
              ["Age-aware pricing", "The 14-year-old flows into airline, hotel, and package fare rules."],
              ["Complete trip total", "Transport, stay, luggage, transfers, food, insurance, and fees."]
            ].map(([title, detail], index) => (
              <div
                key={title}
                className="animate-fade-up rounded-[24px] bg-[#fbf7ef] p-5 transition hover:-translate-y-0.5 hover:shadow-soft"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="mt-2 text-sm leading-6 text-ink/60">{detail}</p>
              </div>
            ))}
            </div>
          )}

          {status === "loading" && (
            <div className="flex min-h-[360px] animate-fade-in flex-col items-center justify-center rounded-[2rem] border border-line bg-white/70 p-10 text-center shadow-soft">
              <div className="relative grid h-16 w-16 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
                <span className="relative grid h-14 w-14 place-items-center rounded-full bg-accent/10">
                  <Loader2 className="h-7 w-7 animate-spin text-accent" />
                </span>
              </div>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight">
                Weaving transport, stays and packages
              </h2>
              <p className="mt-2 max-w-xl text-ink/64">
                Provider adapters are pricing each traveler separately and checking room occupancy rules.
              </p>
              <div className="mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-line">
                <div className="h-full w-1/3 animate-shimmer rounded-full bg-[linear-gradient(90deg,transparent,theme(colors.accent),transparent)] bg-[length:200%_100%]" />
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="animate-scale-in rounded-[2rem] border border-accent/30 bg-accent/5 p-8">
              <h2 className="text-xl font-semibold">Something needs a second pass</h2>
              <p className="mt-2 text-ink/66">{errors[0]}</p>
            </div>
          )}

          {status === "ready" && scoredResults && !featuredTrip && realResults && (
            <div className="animate-scale-in rounded-[2rem] border border-line bg-white/90 p-8 shadow-soft">
              <h2 className="text-xl font-semibold text-ink">No combined trip options yet</h2>
              <p className="mt-2 text-ink/66">
                None of the configured providers returned results for this search. Check the provider status below.
              </p>
              <div className="mt-5 space-y-2">
                {realResults.providerStatuses.map((provider) => (
                  <div
                    key={provider.providerId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper/70 px-4 py-3 text-sm"
                  >
                    <span className="font-semibold text-ink">{provider.providerId}</span>
                    <span className={provider.ok ? "text-sageDark" : "text-accentDark"}>
                      {provider.message ?? (provider.ok ? "OK" : "Failed")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === "ready" && scoredResults && featuredTrip && realResults && (
            <div className="grid animate-fade-up grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 space-y-6">
                <OptimizerPanel
                  weights={weights}
                  onChange={setWeights}
                  featuredTrip={featuredTrip}
                  comparedTrips={comparedTrips}
                />
                <OptimizerAgentReview
                  criteria={toTripSearchCriteria(criteria)}
                  transportOptions={realResults.transportOptions}
                  accommodationOptions={realResults.accommodationOptions}
                  tripOptions={realResults.tripOptions}
                  weights={toRealWeights(weights)}
                  initialReview={realResults.optimizerReview}
                />
                <ResultsTabs
                  results={scoredResults}
                  compareIds={compareIds}
                  savedIds={savedTrips.map((trip) => trip.id)}
                  onCompare={handleCompare}
                  onSave={handleSave}
                  onRemoveSaved={handleRemoveSaved}
                />
              </div>
              <TripSummaryRail
                criteria={criteria}
                featuredTrip={featuredTrip}
                comparedTrips={comparedTrips}
                savedTrips={savedTrips}
                onRemoveSaved={handleRemoveSaved}
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
