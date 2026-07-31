"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Hotel,
  Loader2,
  MapPinned,
  PackageCheck,
  Plane,
  Sparkles,
  TrainFront
} from "lucide-react";
import type { SearchResults, TripOption } from "@/lib/types";
import { AccommodationList } from "./AccommodationList";
import { CompareBar } from "./CompareBar";
import { PackageHolidayList } from "./PackageHolidayList";
import { TransportOptionList } from "./TransportOptionList";
import { TripOptionCard } from "./TripOptionCard";
import {
  DEFAULT_ESTIMATE_LABEL,
  RESULTS_TABS,
  buildRecommendationBadges,
  formatGeneratedAt,
  formatMoney,
  getRecommendationTiles,
  getResultsCounts
} from "./helpers";
import type { ProviderActionPayload, ProviderStatus, ResultsTabId, SaveTarget } from "./types";

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
  estimateLabel?: string;
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
  estimateLabel = DEFAULT_ESTIMATE_LABEL,
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
  const recommendationTiles = useMemo(() => getRecommendationTiles(results.tripOptions), [results.tripOptions]);
  const comparedOptions = results.tripOptions.filter((option) => activeComparedIds.includes(option.id));

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
    <section className={clsx("mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8", className)}>
      <header className="mb-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accentDark">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {estimateLabel}
          </div>
          <h1 className="text-3xl font-bold tracking-normal text-ink sm:text-4xl">Trip comparison results</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65">
            {results.criteria.origin} to {results.criteria.destination} | {results.criteria.travelers.totalTravelers} traveler
            {results.criteria.travelers.totalTravelers === 1 ? "" : "s"} | generated{" "}
            {formatGeneratedAt(results.generatedAt)}
          </p>
        </div>

        <div className="grid gap-2 rounded-lg border border-line bg-white/70 p-4 shadow-soft sm:grid-cols-2 lg:min-w-[24rem]">
          <HeaderMetric
            icon={CalendarClock}
            label="Dates"
            value={`${results.criteria.departureDate} to ${results.criteria.returnDate}`}
          />
          <HeaderMetric
            icon={MapPinned}
            label="Budget"
            value={results.criteria.budget ? formatMoney(results.criteria.budget) : "No max budget"}
          />
        </div>
      </header>

      {providerStatuses.length > 0 ? <ProviderStatusStrip statuses={providerStatuses} /> : null}

      <nav className="mb-6 overflow-x-auto" aria-label="Result categories">
        <div className="inline-flex min-w-full gap-2 rounded-lg border border-line bg-white/75 p-1 shadow-soft sm:min-w-0">
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
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Recommendation categories">
            {recommendationTiles.map((tile, index) => (
              <div
                key={tile.id}
                className="animate-fade-up rounded-lg border border-line bg-white/75 p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">{tile.label}</p>
                <p className="mt-2 truncate text-sm font-semibold text-ink">
                  {tile.option ? tile.option.label : "No match yet"}
                </p>
                <p className="mt-1 text-xl font-bold text-accentDark">{tile.metric}</p>
              </div>
            ))}
          </section>

          {results.tripOptions.length > 0 ? (
            <div className="grid gap-5">
              {results.tripOptions.map((option, index) => {
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
                      estimateLabel={estimateLabel}
                      onToggleSave={toggleSavedTrip}
                      onToggleCompare={toggleCompare}
                      onOpenProvider={onOpenProvider}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No complete trips" body="The provider estimates did not return a combined option yet." />
          )}

          <CompareBar
            selectedOptions={comparedOptions}
            maxOptions={maxComparedOptions}
            estimateLabel={estimateLabel}
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
            estimateLabel={estimateLabel}
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
          <AccommodationList
            options={results.accommodationOptions}
            rejectedOptions={results.rejectedAccommodation}
            savedOptionIds={activeSavedIds}
            estimateLabel={estimateLabel}
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
        ) : (
          <EmptyState title="No accommodation estimates" body="Stay provider estimates are still pending." />
        )
      ) : null}

      {activeTab === "packages" ? (
        results.packageHolidays.length > 0 ? (
          <PackageHolidayList
            options={results.packageHolidays}
            savedOptionIds={activeSavedIds}
            estimateLabel={estimateLabel}
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
        ) : (
          <EmptyState title="No package holidays" body="Package holiday provider estimates are still pending." />
        )
      ) : null}
    </section>
  );
}

function ProviderStatusStrip({ statuses }: { statuses: ProviderStatus[] }) {
  return (
    <section className="mb-6 rounded-lg border border-line bg-white/70 p-4 shadow-soft" aria-label="Provider agent status">
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

function HeaderMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-accentDark">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
        <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white/70 p-8 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
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

