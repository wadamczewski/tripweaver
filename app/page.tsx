"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Compass,
  Loader2,
  Pencil,
  Users,
  WalletCards
} from "lucide-react";
import { SearchPanel } from "@/components/search/SearchPanel";
import { OptimizerPanel } from "@/components/optimizer/OptimizerPanel";
import { ResultsTabs } from "@/components/results/ResultsTabs";
import { OptimizerAgentReview } from "@/components/optimizer/OptimizerAgentReview";
import { formatMoney } from "@/lib/currency";
import { DEFAULT_SEARCH, DEFAULT_WEIGHTS, summarizeTravelers } from "@/lib/defaults";
import { scoreTripOptions } from "@/lib/scoring";
import { toTripSearchCriteria, toRealWeights } from "@/lib/adapters/criteria";
import { toSearchResults } from "@/lib/adapters/results";
import {
  loadSavedTrips,
  persistSavedTrips,
  removeSavedTrip,
  upsertSavedTrip
} from "@/lib/storage";
import { useDestinationImages } from "@/lib/useDestinationImages";
import type { OptimizerWeights, SearchCriteria, SearchResults, TripOption } from "@/lib/types";
import type { TripSearchResults } from "@/lib/trip/types";
import { validateSearchCriteria } from "@/lib/validation";

type SearchState = "idle" | "loading" | "ready" | "error";

export default function Home() {
  const [criteria, setCriteria] = useState<SearchCriteria>(DEFAULT_SEARCH);
  const [weights, setWeights] = useState<OptimizerWeights>(DEFAULT_WEIGHTS);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [realResults, setRealResults] = useState<TripSearchResults | null>(null);
  const [status, setStatus] = useState<SearchState>("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [savedTrips, setSavedTrips] = useState<TripOption[]>([]);
  const [isEditingSearch, setIsEditingSearch] = useState(false);

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
  const { images: destinationImages, activeIndex: destinationImageIndex } = useDestinationImages(
    criteria.destination
  );
  const showSearchWizard = status !== "ready" || isEditingSearch;

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
      const image = destinationImages[destinationImageIndex] ?? destinationImages[0] ?? "";
      const nextResults = toSearchResults(nextCriteria, image, nextRealResults);

      setRealResults(nextRealResults);
      setResults(nextResults);
      setStatus("ready");
      setIsEditingSearch(false);
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
    <main className="min-h-screen bg-[#f6f0e6]">
      <div className="fixed inset-0 z-0 overflow-hidden bg-ink" aria-hidden="true">
        {destinationImages.map((src, index) => (
          <img
            key={src}
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1800ms] ease-in-out"
            style={{ opacity: index === destinationImageIndex ? 1 : 0 }}
          />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,32,51,0.9)_0%,rgba(16,32,51,0.62)_40%,rgba(16,32,51,0.88)_100%)]" />
      </div>

      {status === "loading" && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-ink/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-scale-in rounded-[2rem] border border-line bg-paper p-10 text-center shadow-lift">
            <div className="relative mx-auto grid h-16 w-16 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
              <span className="relative grid h-14 w-14 place-items-center rounded-full bg-accent/10">
                <Loader2 className="h-7 w-7 animate-spin text-accent" />
              </span>
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-ink">
              Weaving transport, stays and packages
            </h2>
            <p className="mt-2 text-ink/64">
              Provider adapters are pricing each traveler separately and checking room occupancy rules.
            </p>
            <div className="mx-auto mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-line">
              <div className="h-full w-1/3 animate-shimmer rounded-full bg-[linear-gradient(90deg,transparent,theme(colors.accent),transparent)] bg-[length:200%_100%]" />
            </div>
          </div>
        </div>
      )}

      {showSearchWizard ? (
        <section className="relative text-white">
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
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Build your dream trip, one decision at a time.
            </h1>

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
      ) : (
        <SearchSummaryBar criteria={criteria} onEdit={() => setIsEditingSearch(true)} />
      )}

      <section className={`relative px-4 py-10 sm:px-6 lg:px-8 ${status === "ready" ? "min-h-screen" : ""}`}>
        <div className="relative z-10 mx-auto max-w-7xl">
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
            <div className="grid animate-fade-up grid-cols-1 gap-6 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start">
              <OptimizerPanel
                className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
                weights={weights}
                onChange={setWeights}
                featuredTrip={featuredTrip}
                comparedTrips={comparedTrips}
              />
              <div className="min-w-0 space-y-6">
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
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function SearchSummaryBar({
  criteria,
  onEdit
}: {
  criteria: SearchCriteria;
  onEdit: () => void;
}) {
  return (
    <section className="relative text-white">
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ink shadow-soft">
            <Compass className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight">
              {criteria.origin} to {criteria.destination || "Anywhere"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {criteria.departureDate} to {criteria.returnDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {summarizeTravelers(criteria.travelers)}
              </span>
              <span className="flex items-center gap-1.5">
                <WalletCards className="h-3.5 w-3.5" aria-hidden="true" />
                {criteria.budget ? formatMoney(criteria.budget) : "No cap"}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/20"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit search
        </button>
      </div>
    </section>
  );
}
