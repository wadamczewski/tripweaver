"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  Leaf,
  Luggage,
  Route,
  Timer,
  UsersRound
} from "lucide-react";
import type { TransportOption } from "@/lib/types";
import { useInfiniteReveal } from "@/lib/useInfiniteReveal";
import {
  formatCarbon,
  formatClock,
  formatDuration,
  formatModes,
  formatMoney,
  formatTravelerCategory,
  getSegmentRoute,
  getTravelerPriceTotal,
  getTransportProviderAction
} from "./helpers";
import { InfiniteScrollFooter } from "./InfiniteScrollFooter";
import type { ProviderActionPayload } from "./types";

const PAGE_SIZE = 20;

type TransportOptionListProps = {
  options: TransportOption[];
  savedOptionIds?: string[];
  className?: string;
  onToggleSave?: (option: TransportOption) => void;
  onOpenProvider?: (action: ProviderActionPayload) => void;
};

export function TransportOptionList({
  options,
  savedOptionIds = [],
  className,
  onToggleSave,
  onOpenProvider
}: TransportOptionListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { visibleItems, sentinelRef, hasMore, showMore } = useInfiniteReveal(options, PAGE_SIZE);

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <section className={clsx("grid gap-4", className)}>
      {visibleItems.map((option) => {
        const expanded = expandedIds.has(option.id);
        const saved = savedOptionIds.includes(option.id);
        const action = getTransportProviderAction(option);

        return (
          <article key={option.id} className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {option.savingBadge ? (
                    <span className="rounded-full bg-sage/10 px-3 py-1 text-xs font-semibold text-sageDark">
                      {option.savingBadge}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accentDark">
                    {formatModes(option.modes)}
                  </span>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">{option.label}</h2>
                    <p className="mt-1 text-sm text-ink/60">
                      {option.origin} to {option.destination} | {option.provider}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={clsx(
                      "inline-flex h-10 w-10 items-center justify-center rounded-full border transition",
                      saved
                        ? "border-accent/30 bg-accent/10 text-accentDark"
                        : "border-line bg-paper text-ink/60 hover:border-accent/30 hover:text-accentDark"
                    )}
                    aria-pressed={saved}
                    aria-label={saved ? "Remove saved transport" : "Save transport"}
                    onClick={() => onToggleSave?.(option)}
                  >
                    <Heart className={clsx("h-4 w-4", saved && "fill-current")} aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <TransportMetric icon={Timer} label="Duration" value={formatDuration(option.totalDurationMinutes)} />
                  <TransportMetric
                    icon={Route}
                    label="Times"
                    value={`${formatClock(option.departureTime)} to ${formatClock(option.arrivalTime)}`}
                  />
                  <TransportMetric
                    icon={Luggage}
                    label="Luggage"
                    value={option.luggageIncluded ? "Included" : formatMoney(option.luggagePrice)}
                  />
                  <TransportMetric icon={Leaf} label="Carbon" value={formatCarbon(option.carbonKg)} />
                </div>
              </div>

              <aside className="rounded-lg bg-mist p-4 lg:min-w-[13rem] lg:text-right">
                <p className="text-2xl font-bold text-ink">{formatMoney(option.totalPrice)}</p>
                <p className="mt-1 text-sm text-ink/60">
                  {option.transfers} transfer{option.transfers === 1 ? "" : "s"}
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-accentDark"
                  aria-expanded={expanded}
                  onClick={() => toggleExpanded(option.id)}
                >
                  {expanded ? "Hide details" : "Show details"}
                  {expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                </button>
              </aside>
            </div>

            {expanded ? (
              <div className="grid gap-4 border-t border-line bg-paper/70 p-5 xl:grid-cols-[1fr_0.9fr]">
                <div className="space-y-3">
                  {option.segments.map((segment) => (
                    <div key={segment.id} className="rounded-md border border-line bg-white/80 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">{getSegmentRoute(segment)}</p>
                          <p className="mt-1 text-xs text-ink/55">
                            {segment.provider} | {formatDuration(segment.durationMinutes)} | {segment.transfers} transfer
                            {segment.transfers === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-ink">{formatMoney(segment.price)}</span>
                      </div>
                    </div>
                  ))}
                  {option.providerNotes.length > 0 ? (
                    <div className="rounded-md bg-sage/10 p-3">
                      <p className="text-sm font-semibold text-ink">Provider notes</p>
                      <ul className="mt-2 space-y-1.5">
                        {option.providerNotes.map((note) => (
                          <li key={note} className="text-sm leading-5 text-ink/70">
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-line bg-white/80 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                      <UsersRound className="h-4 w-4 text-sage" aria-hidden="true" />
                      Traveler fares
                    </div>
                    <div className="grid gap-2">
                      {option.travelerPrices.map((price) => (
                        <div key={price.travelerId} className="flex items-center justify-between gap-3 rounded-md bg-paper p-3">
                          <div>
                            <p className="text-sm font-semibold text-ink">{price.travelerLabel}</p>
                            <p className="text-xs text-ink/55">{formatTravelerCategory(price.providerCategory)}</p>
                            {price.note ? <p className="mt-1 text-xs text-accentDark">{price.note}</p> : null}
                          </div>
                          <span className="text-sm font-bold text-ink">{formatMoney(getTravelerPriceTotal(price))}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-line bg-white/80 p-4">
                    <p className="text-sm font-semibold text-ink">Open at provider</p>
                    {action ? (
                      <a
                        href={action.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex w-full items-center justify-between rounded-md border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink transition hover:border-accent/30 hover:text-accentDark"
                        onClick={() => onOpenProvider?.(action)}
                      >
                        {action.label}
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="mt-3 inline-flex w-full cursor-not-allowed items-center justify-between rounded-md border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink/60"
                        disabled
                      >
                        Open at provider
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}

      {options.length > 0 ? (
        <InfiniteScrollFooter
          sentinelRef={sentinelRef}
          hasMore={hasMore}
          visibleCount={visibleItems.length}
          totalCount={options.length}
          itemLabel="transport options"
          onShowMore={showMore}
        />
      ) : null}
    </section>
  );
}

function TransportMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Timer;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-line bg-paper/70 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
        <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

