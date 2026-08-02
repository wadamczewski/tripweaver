"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Hotel,
  Loader2,
  PackageCheck,
  Plane,
  TrainFront
} from "lucide-react";
import type { SearchResults, TripOption } from "@/lib/types";
import { useInfiniteReveal } from "@/lib/useInfiniteReveal";
import { AccommodationList } from "./AccommodationList";
import { AllHotelsMap } from "./AllHotelsMap";
import { CompareBar } from "./CompareBar";
import { InfiniteScrollFooter } from "./InfiniteScrollFooter";
import { PackageHolidayList } from "./PackageHolidayList";
import { TransportOptionList } from "./TransportOptionList";
import { TripOptionCard } from "./TripOptionCard";
import { RESULTS_TABS, buildRecommendationBadges, getRecommendationTiles, getResultsCounts } from "./helpers";
import type { ProviderActionPayload, ProviderStatus, ResultsTabId, SaveTarget } from "./types";

const TRIP_PAGE_SIZE = 20;

type ResultsTabsProps = {
  results: SearchResults;
  selectedTab?: ResultsTabId;
  defaultTab?: ResultsTabId;
  savedOptionIds?: string[];
  savedIds?: string[];
  comparedOptionIds?: string[];
  compareIds?: string[];
  maxComparedOptions?: number;
  providerStatuses?: ProviderStatus[];
  isPackagesPending?: boolean;
  isAgentReviewing?: boolean;
  className?: string;
  onTabChange?: (tab: ResultsTabId) => void;
  onToggleSave?: (target: SaveTarget) => void;
  onSave?: (option: TripOption) => void;
  onRemoveSaved?: (tripId: string) => void;
  onToggleCompare?: (option: TripOption) => void;
  onCompare?: (tripId: string) => void;
  onRemoveCompared?: (option: TripOption) => void;
  onClearCompare?: () => void;
  onCompareSelected?: (options: TripOption[]) => void;
  onOpenProvider?: (action: ProviderActionPayload) => void;
};

export function ResultsTabs({
  results,
  selectedTab,
  defaultTab = "complete",
  savedOptionIds,
  savedIds,
  comparedOptionIds,
  compareIds,
  maxComparedOptions = 3,
  providerStatuses = [],
  isPackagesPending = false,
  isAgentReviewing = false,
  className,
  onTabChange,
  onToggleSave,
  onSave,
  onRemoveSaved,
  onToggleCompare,
  onCompare,
  onRemoveCompared,
  onClearCompare,
  onCompareSelected,
  onOpenProvider
}: ResultsTabsProps) {
  const [internalTab, setInternalTab] = useState<ResultsTabId>(defaultTab);
  const [internalComparedIds, setInternalComparedIds] = useState<string[]>([]);
  const activeTab = selectedTab ?? internalTab;
  const activeSavedIds = savedOptionIds ?? savedIds ?? [];
  const activeComparedIds = comparedOptionIds ?? compareIds ?? internalComparedIds;
  const counts = getResultsCounts(results);
  const recommendationBadges = useMemo(
    () => buildRecommendationBadges(results.tripOptions),
    [results.tripOptions]
  );
  const recommendationTiles = useMemo(
    () => getRecommendationTiles(results.tripOptions, isPackagesPending, isAgentReviewing),
    [results.tripOptions, isPackagesPending, isAgentReviewing]
  );
  const comparedOptions = results.tripOptions.filter((option) => activeComparedIds.includes(option.id));
  const {
    visibleItems: visibleTripOptions,
    sentinelRef: tripSentinelRef,
    hasMore: hasMoreTrips,
    showMore: showMoreTrips
  } = useInfiniteReveal(results.tripOptions, TRIP_PAGE_SIZE);

  function selectTab(tab: ResultsTabId) {
    setInternalTab(tab);
    onTabChange?.(tab);
  }

  function toggleCompare(option: TripOption) {
    if (onToggleCompare) {
      onToggleCompare(option);
      return;
    }

    if (onCompare) {
      onCompare(option.id);
      return;
    }

    setInternalComparedIds((current) => {
      if (current.includes(option.id)) {
        return current.filter((id) => id !== option.id);
      }

      if (current.length >= maxComparedOptions) {
        return current;
      }

      return [...current, option.id];
    });
  }

  function removeCompared(option: TripOption) {
    if (onRemoveCompared) {
      onRemoveCompared(option);
      return;
    }

    if (onCompare) {
      onCompare(option.id);
      return;
    }

    toggleCompare(option);
  }

  function clearCompared() {
    if (onClearCompare) {
      onClearCompare();
      return;
    }

    if (onCompare) {
      comparedOptions.forEach((option) => onCompare(option.id));
      return;
    }

    setInternalComparedIds([]);
  }

  function toggleSavedTrip(option: TripOption) {
    if (onToggleSave) {
      onToggleSave({
        kind: "trip",
        id: option.id,
        label: option.label,
        option
      });
      return;
    }

    if (activeSavedIds.includes(option.id)) {
      onRemoveSaved?.(option.id);
      return;
    }

    onSave?.(option);
  }

  return (
    <section className={clsx("w-full", className)}>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-normal text-white sm:text-4xl">Results</h1>
      </header>

      {providerStatuses.length > 0 ? <ProviderStatusStrip statuses={providerStatuses} /> : null}

      <nav className="mb-6 overflow-x-auto" aria-label="Result categories">
        <div className="flex w-full min-w-full gap-2 rounded-lg border border-line bg-white p-1 shadow-soft">
          {RESULTS_TABS.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                className={clsx(
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition duration-200",
                  isActive ? "bg-ink text-white shadow-sm" : "text-ink/60 hover:bg-mist hover:text-ink"
                )}
                aria-current={isActive ? "page" : undefined}
                onClick={() => selectTab(tab.id)}
              >
                {getTabIcon(tab.id)}
                {tab.label}
                <span
                  className={clsx(
                    "rounded-full px-2 py-0.5 text-xs",
                    isActive ? "bg-white/15 text-white" : "bg-mist text-ink/50"
                  )}
                >
                  {counts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {activeTab === "complete" ? (
        <div className="space-y-5">
          <LiveStatusStrip
            results={results}
            isPackagesPending={isPackagesPending}
            isAgentReviewing={isAgentReviewing}
          />

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Recommendation categories">
            {recommendationTiles.map((tile, index) => (
              <div
                key={tile.id}
                className="animate-fade-up rounded-lg border border-line bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">{tile.label}</p>
                <p className="mt-2 flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
                  {tile.pending ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" aria-hidden="true" />
                  ) : null}
                  {tile.name ?? "No match yet"}
                </p>
                <p className="mt-1 text-xl font-bold text-accentDark">{tile.metric}</p>
              </div>
            ))}
          </section>

          {results.tripOptions.length > 0 ? (
            <div className="grid gap-5">
              {visibleTripOptions.map((option, index) => {
                const isCompared = activeComparedIds.includes(option.id);
                const compareDisabled = activeComparedIds.length >= maxComparedOptions && !isCompared;

                return (
                  <div
                    key={option.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
                  >
                    <TripOptionCard
                      option={option}
                      recommendationCategories={recommendationBadges[option.id]}
                      isSaved={activeSavedIds.includes(option.id)}
                      isCompared={isCompared}
                      compareDisabled={compareDisabled}
                      onToggleSave={toggleSavedTrip}
                      onToggleCompare={toggleCompare}
                      onOpenProvider={onOpenProvider}
                    />
                  </div>
                );
              })}

              <InfiniteScrollFooter
                sentinelRef={tripSentinelRef}
                hasMore={hasMoreTrips}
                visibleCount={visibleTripOptions.length}
                totalCount={results.tripOptions.length}
                itemLabel="complete trips"
                onShowMore={showMoreTrips}
              />
            </div>
          ) : isPackagesPending ? (
            <PendingState
              title="Still searching for complete trips"
              body="No flight + stay combination or package holiday matches yet, but package holidays are still being checked — this can take up to two minutes. This list updates automatically."
            />
          ) : (
            <EmptyState title="No complete trips" body="The provider estimates did not return a combined option yet." />
          )}

          <CompareBar
            selectedOptions={comparedOptions}
            maxOptions={maxComparedOptions}
            onRemove={removeCompared}
            onClear={clearCompared}
            onCompare={onCompareSelected}
          />
        </div>
      ) : null}

      {activeTab === "transport" ? (
        results.transportOptions.length > 0 ? (
          <TransportOptionList
            options={results.transportOptions}
            savedOptionIds={activeSavedIds}
            onToggleSave={(option) =>
              onToggleSave?.({
                kind: "transport",
                id: option.id,
                label: option.label,
                option
              })
            }
            onOpenProvider={onOpenProvider}
          />
        ) : (
          <EmptyState title="No transport estimates" body="Transport provider estimates are still pending." />
        )
      ) : null}

      {activeTab === "accommodation" ? (
        results.accommodationOptions.length > 0 || results.rejectedAccommodation.length > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <AllHotelsMap options={[...results.accommodationOptions, ...results.rejectedAccommodation]} />
            </div>
            <AccommodationList
              options={results.accommodationOptions}
              rejectedOptions={results.rejectedAccommodation}
              savedOptionIds={activeSavedIds}
              onToggleSave={(option) =>
                onToggleSave?.({
                  kind: "accommodation",
                  id: option.id,
                  label: option.name,
                  option
                })
              }
              onOpenProvider={onOpenProvider}
            />
          </div>
        ) : (
          <EmptyState title="No accommodation estimates" body="Stay provider estimates are still pending." />
        )
      ) : null}

      {activeTab === "packages" ? (
        results.packageHolidays.length > 0 ? (
          <PackageHolidayList
            options={results.packageHolidays}
            savedOptionIds={activeSavedIds}
            onToggleSave={(option) =>
              onToggleSave?.({
                kind: "package",
                id: option.id,
                label: option.hotelName,
                option
              })
            }
            onOpenProvider={onOpenProvider}
          />
        ) : isPackagesPending ? (
          <PendingState
            title="Searching package holidays"
            body="Checking real German tour-operator sites (TUI, DERTOUR, weg.de and others) — this can take up to two minutes. Results will appear here automatically, no need to reload."
          />
        ) : (
          <EmptyState
            title="No package holidays"
            body="No operator returned a bundled offer for this route and dates."
          />
        )
      ) : null}
    </section>
  );
}

// A compact, always-visible summary of what's still loading on the
// Complete Trips tab — flights/hotels resolve fast and are always
// "complete" by the time this tab is reachable, but packages (up to ~2
// minutes) and the AI ranking (~20-60s, sometimes twice) run in the
// background and can leave results updating under the user with no other
// visible signal otherwise.
function LiveStatusStrip({
  results,
  isPackagesPending,
  isAgentReviewing
}: {
  results: SearchResults;
  isPackagesPending: boolean;
  isAgentReviewing: boolean;
}) {
  const items: { id: string; label: string; state: ProviderStatus["state"]; detail: string }[] = [
    {
      id: "core",
      label: "Flights & hotels",
      state: "complete",
      detail: `${results.transportOptions.length} flights, ${results.accommodationOptions.length} stays`
    },
    {
      id: "packages",
      label: "Package holidays",
      state: isPackagesPending ? "running" : "complete",
      detail: isPackagesPending
        ? "Checking tour-operator sites (up to 2 min)"
        : results.packageHolidays.length > 0
          ? `${results.packageHolidays.length} found`
          : "None found for this search"
    },
    {
      id: "agent",
      label: "AI ranking",
      state: isAgentReviewing ? "running" : "complete",
      detail: isAgentReviewing ? "Ranking your options…" : "Ranking complete"
    }
  ];

  return (
    <section
      className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-line bg-white px-4 py-3 shadow-soft"
      aria-label="Search progress"
      aria-live="polite"
    >
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <StatusIcon state={item.state} />
          <span className="text-sm font-semibold text-ink">{item.label}</span>
          <span className="text-xs text-ink/55">{item.detail}</span>
        </div>
      ))}
    </section>
  );
}

function ProviderStatusStrip({ statuses }: { statuses: ProviderStatus[] }) {
  return (
    <section className="mb-6 rounded-lg border border-line bg-white p-4 shadow-soft" aria-label="Provider agent status">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Provider agents</h2>
          <p className="mt-1 text-xs text-ink/55">Parallel estimate checks normalized into one comparison.</p>
        </div>
        <span className="rounded-full bg-sage/10 px-3 py-1 text-xs font-semibold text-sageDark">
          {statuses.filter((status) => status.state === "complete").length}/{statuses.length} complete
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {statuses.map((status) => (
          <div key={status.id} className="flex items-center gap-3 rounded-md bg-paper p-3">
            <StatusIcon state={status.state} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{status.label}</p>
              <p className="truncate text-xs text-ink/55">
                {status.detail ?? `${status.estimateCount ?? 0} estimate${status.estimateCount === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusIcon({ state }: { state: ProviderStatus["state"] }) {
  if (state === "running") {
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden="true" />;
  }

  if (state === "complete") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-sage" aria-hidden="true" />;
  }

  if (state === "error") {
    return <AlertCircle className="h-4 w-4 shrink-0 text-accentDark" aria-hidden="true" />;
  }

  return <CircleDashed className="h-4 w-4 shrink-0 text-ink/35" aria-hidden="true" />;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink/55">{body}</p>
    </div>
  );
}

function PendingState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <Loader2 className="mx-auto h-5 w-5 animate-spin text-accent" aria-hidden="true" />
      <p className="mt-3 text-base font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink/55">{body}</p>
    </div>
  );
}

function getTabIcon(tab: ResultsTabId) {
  const className = "h-4 w-4";

  if (tab === "complete") {
    return <Plane className={className} aria-hidden="true" />;
  }

  if (tab === "transport") {
    return <TrainFront className={className} aria-hidden="true" />;
  }

  if (tab === "accommodation") {
    return <Hotel className={className} aria-hidden="true" />;
  }

  return <PackageCheck className={className} aria-hidden="true" />;
}

