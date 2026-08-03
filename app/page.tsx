"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Compass,
  Info,
  Loader2,
  Pencil,
  Users,
  WalletCards
} from "lucide-react";
import { SearchPanel } from "@/components/search/SearchPanel";
import { OptimizerPanel } from "@/components/optimizer/OptimizerPanel";
import { ResultsTabs } from "@/components/results/ResultsTabs";
import { OptimizerAgentReview } from "@/components/optimizer/OptimizerAgentReview";
import type { OptimizerAgentReviewHandle } from "@/components/optimizer/OptimizerAgentReview";
import { formatMoney } from "@/lib/currency";
import { DEFAULT_SEARCH, DEFAULT_WEIGHTS, summarizeTravelers } from "@/lib/defaults";
import { applyAgentRanking, scoreTripOptions } from "@/lib/scoring";
import { toTripSearchCriteria, toRealWeights, weightsFromPreferences } from "@/lib/adapters/criteria";
import { toSearchResults } from "@/lib/adapters/results";
import {
  loadSavedTrips,
  persistSavedTrips,
  removeSavedTrip,
  upsertSavedTrip
} from "@/lib/storage";
import { useDestinationImages } from "@/lib/useDestinationImages";
import { useNearestCity } from "@/lib/useNearestCity";
import type { OptimizerWeights, SearchCriteria, TripOption } from "@/lib/types";
import type {
  OptimizerAgentReview as OptimizerAgentReviewResult,
  PackageSearchResults,
  ProviderStatus,
  TripSearchCoreResults,
  TripSearchCriteria,
  TripSearchResults
} from "@/lib/trip/types";
import { validateSearchCriteria } from "@/lib/validation";

type SearchState = "idle" | "loading" | "ready" | "error";

export default function Home() {
  const [criteria, setCriteria] = useState<SearchCriteria>(DEFAULT_SEARCH);
  // The criteria a search was actually submitted with, separate from the
  // live `criteria` state above (which updates on every keystroke while
  // editing) — results must stay pinned to what was searched, not follow
  // in-progress edits to the form.
  const [submittedCriteria, setSubmittedCriteria] = useState<SearchCriteria>(DEFAULT_SEARCH);
  const [heroImage, setHeroImage] = useState("");
  const [weights, setWeights] = useState<OptimizerWeights>(DEFAULT_WEIGHTS);
  const [realResults, setRealResults] = useState<TripSearchResults | null>(null);
  const [status, setStatus] = useState<SearchState>("idle");
  const [isPackagesPending, setIsPackagesPending] = useState(false);
  const [isAgentReviewing, setIsAgentReviewing] = useState(false);
  const [agentHasChanges, setAgentHasChanges] = useState(false);
  const agentReviewRef = useRef<OptimizerAgentReviewHandle>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [savedTrips, setSavedTrips] = useState<TripOption[]>([]);
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  useEffect(() => {
    setSavedTrips(loadSavedTrips());
  }, []);

  // Defaults the "Departure city" field to wherever the user actually is,
  // via the browser's own geolocation permission prompt, instead of always
  // starting from the same fixed city regardless of who's searching. Only
  // applies while the field still has its untouched default value — if the
  // user has already typed a different origin (including by the time this
  // resolves, since geolocation can take a few seconds), their edit wins
  // and this is a no-op.
  const nearestCity = useNearestCity();

  useEffect(() => {
    if (!nearestCity) return;
    setCriteria((current) =>
      current.origin === DEFAULT_SEARCH.origin ? { ...current, origin: nearestCity } : current
    );
  }, [nearestCity]);

  // The results grid replaces the search wizard in place (same page, no
  // navigation) — without this, whatever scroll position the wizard was at
  // (e.g. scrolled down to reach "Find my trip") carries straight over,
  // landing the user mid-way down the results instead of at the top of the
  // center column's tabs.
  useEffect(() => {
    if (status === "ready") {
      window.scrollTo(0, 0);
    }
  }, [status]);

  // Transport/accommodation land fast (a couple of seconds); packages and
  // the optimizer review are fetched separately and merged in as they
  // resolve (see handleSearch/loadPackages) — this recomputes automatically
  // each time, so the UI updates the moment either one lands instead of
  // waiting for everything.
  const results = useMemo(() => {
    if (!realResults) return null;
    return toSearchResults(submittedCriteria, heroImage, realResults);
  }, [realResults, submittedCriteria, heroImage]);

  const scoredResults = useMemo(() => {
    if (!results) {
      return null;
    }

    const locallyScored = scoreTripOptions(results.tripOptions, weights);

    return {
      ...results,
      // The Trip Optimizer agent's ranking is authoritative over the local
      // weighted-average sort once it's available — local scoring still
      // computes each trip's score/explanation, but display order follows
      // the agent's judgment call.
      tripOptions: applyAgentRanking(locallyScored, realResults?.optimizerReview)
    };
  }, [results, weights, realResults?.optimizerReview]);

  const featuredTrip = scoredResults?.tripOptions[0];
  // The agent's caveats/data-gap notes (e.g. "ranked list truncated",
  // "confirm child pricing with the provider") — shown in a sticky right
  // rail instead of inline in the review card, so they stay visible without
  // pushing the card's actual recommendation down the page or scrolling
  // away with it.
  const agentNotes = realResults?.optimizerReview?.warnings ?? [];
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

    // Step 3's "Optimization priorities" checkboxes previously had zero
    // effect anywhere — this makes them the search's actual starting
    // weights instead of always resetting to the same fixed default.
    const nextWeights = weightsFromPreferences(nextCriteria.preferences);
    setWeights(nextWeights);

    const coreCriteria = toTripSearchCriteria(nextCriteria);

    try {
      // Transport + accommodation only — fast (a couple of seconds).
      // Packages and the Trip Optimizer agent are fetched separately below
      // once this lands, instead of making the user wait on whichever of
      // those is slowest before seeing anything.
      const response = await fetch("/api/trip-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coreCriteria)
      });

      if (!response.ok) {
        throw new Error("Trip search request failed");
      }

      const coreResults = (await response.json()) as TripSearchCoreResults;
      const nextRealResults: TripSearchResults = {
        ...coreResults,
        packageOptions: [],
        optimizerReview: undefined
      };
      const image = destinationImages[destinationImageIndex] ?? destinationImages[0] ?? "";
      const nextResults = toSearchResults(nextCriteria, image, nextRealResults);

      setSubmittedCriteria(nextCriteria);
      setHeroImage(image);
      setRealResults(nextRealResults);
      setStatus("ready");
      setIsEditingSearch(false);
      setCompareIds(nextResults.tripOptions.slice(0, 2).map((trip) => trip.id));

      if (coreCriteria.packageHolidays !== false) {
        void loadPackages(coreCriteria);
      }
    } catch {
      setStatus("error");
      setErrors([
        "TripWeaver could not reach the provider adapters. Confirm the API keys in .env.local and try again."
      ]);
    }
  }

  async function loadPackages(coreCriteria: TripSearchCriteria) {
    setIsPackagesPending(true);

    try {
      const response = await fetch("/api/trip-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coreCriteria)
      });

      if (!response.ok) {
        throw new Error("Package search failed");
      }

      const packageResults = (await response.json()) as PackageSearchResults;
      setRealResults((current) =>
        current ? { ...current, packageOptions: packageResults.packageOptions } : current
      );
    } catch {
      // Leave packageOptions empty — the Packages tab already shows an
      // honest "no package holidays" state, which reads correctly whether
      // that's because the search found nothing or the request failed.
    } finally {
      setIsPackagesPending(false);
    }
  }

  function handleAgentReview(review: OptimizerAgentReviewResult) {
    setRealResults((current) => (current ? { ...current, optimizerReview: review } : current));
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
              Weaving transport and stays
            </h2>
            <p className="mt-2 text-ink/64">
              Provider adapters are pricing each traveler separately and checking room occupancy rules. Package
              holidays and the AI recommendation keep loading on the results page — no need to wait here.
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
            <h1 className="text-2xl font-semibold leading-[1.08] tracking-tight sm:text-3xl lg:text-4xl">
              Build your dream trip, in two simple steps.
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
        {/* Wider than the hero/wizard's max-w-7xl specifically while
            results are showing — a real 3-column grid (left panel + center
            results + right agent rail) needs more horizontal room than the
            2-column wizard layout does; without this the third column would
            have to steal width from the center one on any screen narrower
            than ~1800px, which is exactly what widening this avoids. */}
        <div className={`relative z-10 mx-auto ${status === "ready" ? "max-w-[1800px]" : "max-w-7xl"}`}>
          {status === "error" && (
            <div className="animate-scale-in rounded-[2rem] border border-accent/30 bg-accent/5 p-8">
              <h2 className="text-xl font-semibold">Something needs a second pass</h2>
              <p className="mt-2 text-ink/66">{errors[0]}</p>
            </div>
          )}

          {status === "ready" && scoredResults && realResults && (
            <div className="grid animate-fade-up grid-cols-1 gap-6 lg:grid-cols-[400px_minmax(0,1fr)_380px] lg:items-start">
              <OptimizerPanel
                className="lg:sticky lg:top-6"
                weights={weights}
                onChange={setWeights}
                featuredTrip={featuredTrip}
                hasChanges={agentHasChanges}
                isReviewing={isAgentReviewing}
                onRequestReview={() => agentReviewRef.current?.requestReview()}
              />
              <div className="min-w-0 space-y-6">
                {!featuredTrip && (
                  <NoCombinedTripsNotice
                    hasRawResults={
                      realResults.transportOptions.length > 0 ||
                      realResults.accommodationOptions.length > 0 ||
                      realResults.packageOptions.length > 0
                    }
                    providerStatuses={realResults.providerStatuses}
                  />
                )}
                <ResultsTabs
                  results={scoredResults}
                  compareIds={compareIds}
                  savedIds={savedTrips.map((trip) => trip.id)}
                  isPackagesPending={isPackagesPending}
                  isAgentReviewing={isAgentReviewing}
                  onCompare={handleCompare}
                  onSave={handleSave}
                  onRemoveSaved={handleRemoveSaved}
                />
              </div>
              <div className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
                {featuredTrip && (
                  <OptimizerAgentReview
                    ref={agentReviewRef}
                    criteria={toTripSearchCriteria(submittedCriteria)}
                    transportOptions={realResults.transportOptions}
                    accommodationOptions={realResults.accommodationOptions}
                    tripOptions={realResults.tripOptions}
                    packageOptions={realResults.packageOptions}
                    weights={toRealWeights(weights, submittedCriteria.checkedLuggage)}
                    recommendedTrip={featuredTrip}
                    initialReview={realResults.optimizerReview}
                    onReview={handleAgentReview}
                    onReviewingChange={setIsAgentReviewing}
                    onHasChangesChange={setAgentHasChanges}
                  />
                )}
                {agentNotes.length > 0 && (
                  <AgentNotesPanel notes={agentNotes} isUpdating={isAgentReviewing} />
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function AgentNotesPanel({
  notes,
  isUpdating,
  className = ""
}: {
  notes: string[];
  isUpdating: boolean;
  className?: string;
}) {
  return (
    <aside className={`animate-scale-in rounded-2xl border border-line bg-white/90 p-3 shadow-soft ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">Agent notes</h3>
        {isUpdating && <span className="text-xs font-medium text-ink/45">Updating…</span>}
      </div>
      <div className={`mt-2 space-y-2 ${isUpdating ? "opacity-50" : ""}`}>
        {notes.map((note) => (
          <p key={note} className="rounded-md bg-accent/10 p-2.5 text-xs leading-5 text-accentDark">
            {note}
          </p>
        ))}
      </div>
    </aside>
  );
}

function NoCombinedTripsNotice({
  hasRawResults,
  providerStatuses
}: {
  hasRawResults: boolean;
  providerStatuses: ProviderStatus[];
}) {
  if (!hasRawResults) {
    return (
      <div className="animate-scale-in rounded-[2rem] border border-line bg-white/90 p-8 shadow-soft">
        <h2 className="text-xl font-semibold text-ink">No combined trip options yet</h2>
        <p className="mt-2 text-ink/66">
          None of the configured providers returned results for this search. Check the provider status below.
        </p>
        <div className="mt-5 space-y-2">
          {providerStatuses.map((provider) => (
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
    );
  }

  // Transport and/or accommodation providers did find real results — the
  // combined "Complete trips" cross-product just came up empty, almost
  // always because the budget range or transport-mode filter excluded
  // every combination. That's not a "nothing available" situation, so it
  // shouldn't block the page: the real Transport/Accommodation results are
  // still browsable in the tabs below.
  return (
    <div className="animate-scale-in flex items-start gap-3 rounded-[2rem] border border-line bg-white/90 p-6 shadow-soft">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
      <div>
        <h2 className="text-lg font-semibold text-ink">No trips match your current filters</h2>
        <p className="mt-1 text-sm text-ink/66">
          Every flight + stay combination (and any package holidays found) fell outside your budget range or the
          transport modes you selected. Try widening the budget or selecting more transport modes — your real
          Transport and Accommodation results are still available in the tabs below.
        </p>
      </div>
    </div>
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
