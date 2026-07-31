"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  BadgeCheck,
  ChevronDown,
  ExternalLink,
  Heart,
  Hotel,
  Leaf,
  Luggage,
  Plane,
  Route,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound
} from "lucide-react";
import type { TripOption } from "@/lib/types";
import { CostBreakdown } from "./CostBreakdown";
import { Timeline } from "./Timeline";
import {
  DEFAULT_ESTIMATE_LABEL,
  formatCarbon,
  formatClock,
  formatDuration,
  formatMoney,
  getLuggageLabel,
  getPrimaryTransportLabel,
  getProviderLabel,
  getRoomSummary,
  getTravelerGroupSummary,
  getTripProviderActions
} from "./helpers";
import type { ProviderActionPayload, RecommendationBadge } from "./types";

type TripOptionCardProps = {
  option: TripOption;
  recommendationCategories?: RecommendationBadge[];
  isSaved?: boolean;
  isCompared?: boolean;
  compareDisabled?: boolean;
  estimateLabel?: string;
  initialExpanded?: boolean;
  className?: string;
  onToggleSave?: (option: TripOption) => void;
  onToggleCompare?: (option: TripOption) => void;
  onOpenProvider?: (action: ProviderActionPayload) => void;
};

export function TripOptionCard({
  option,
  recommendationCategories = [],
  isSaved = false,
  isCompared = false,
  compareDisabled = false,
  estimateLabel = DEFAULT_ESTIMATE_LABEL,
  initialExpanded = false,
  className,
  onToggleSave,
  onToggleCompare,
  onOpenProvider
}: TripOptionCardProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const providerActions = useMemo(() => getTripProviderActions(option), [option]);
  const firstSegment = option.transportSegments[0];
  const lastSegment = option.transportSegments[option.transportSegments.length - 1];
  const isPackage = option.kind === "package" || Boolean(option.packageHoliday);
  const recommendationReason = option.recommendationReasons[0] ?? option.scoreExplanation;

  return (
    <article
      className={clsx(
        "overflow-hidden rounded-lg border border-line bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift",
        className
      )}
    >
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {recommendationCategories.map((category) => (
              <span
                key={category.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accentDark"
                title={category.description}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {category.label}
              </span>
            ))}
            <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink/60">
              {isPackage ? "Package bundle" : "Self-organized"}
            </span>
            <span className="rounded-full bg-sage/10 px-3 py-1 text-xs font-semibold text-sageDark">
              {estimateLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-ink">{option.label}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">{recommendationReason}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className={clsx(
                  "inline-flex h-10 w-10 items-center justify-center rounded-full border transition",
                  isSaved
                    ? "border-accent/30 bg-accent/10 text-accentDark"
                    : "border-line bg-paper text-ink/60 hover:border-accent/30 hover:text-accentDark"
                )}
                aria-pressed={isSaved}
                aria-label={isSaved ? "Remove saved trip" : "Save trip"}
                onClick={() => onToggleSave?.(option)}
              >
                <Heart className={clsx("h-4 w-4", isSaved && "fill-current")} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={clsx(
                  "inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition",
                  isCompared
                    ? "border-sage/30 bg-sage/10 text-sageDark"
                    : "border-line bg-paper text-ink/65 hover:border-sage/30 hover:text-sageDark",
                  compareDisabled && !isCompared && "cursor-not-allowed opacity-45 hover:border-line hover:text-ink/65"
                )}
                aria-pressed={isCompared}
                disabled={compareDisabled && !isCompared}
                onClick={() => onToggleCompare?.(option)}
              >
                <Scale className="h-4 w-4" aria-hidden="true" />
                {isCompared ? "Compared" : "Compare"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TripStat icon={Plane} label="Transport" value={getPrimaryTransportLabel(option)} />
            <TripStat
              icon={Route}
              label="Times"
              value={
                firstSegment && lastSegment
                  ? `${formatClock(firstSegment.departureTime)} to ${formatClock(lastSegment.arrivalTime)}`
                  : formatDuration(option.totalDurationMinutes)
              }
            />
            <TripStat icon={Hotel} label="Stay" value={`${option.accommodation.name} (${option.accommodation.rating})`} />
            <TripStat icon={Leaf} label="Carbon" value={formatCarbon(option.carbonKg)} />
          </div>
        </div>

        <aside className="flex min-w-[15rem] flex-col justify-between rounded-lg bg-mist p-4 lg:items-end">
          <div className="w-full lg:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/62">{estimateLabel}</p>
            <p className="mt-2 text-3xl font-bold tracking-normal text-ink">{formatMoney(option.totalPrice)}</p>
            <p className="mt-1 text-sm font-medium text-ink/60">{formatMoney(option.pricePerPerson)} per person</p>
          </div>
          <div className="mt-5 grid w-full grid-cols-3 gap-2 text-center">
            <MiniMetric label="Score" value={`${option.score}`} />
            <MiniMetric label="Time" value={formatDuration(option.totalDurationMinutes)} />
            <MiniMetric label="Transfers" value={`${option.transfers}`} />
          </div>
        </aside>
      </div>

      <div className="grid gap-3 border-t border-line bg-paper/75 px-5 py-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailLine icon={UsersRound} label="Travelers" value={getTravelerGroupSummary(option)} />
        <DetailLine icon={Luggage} label="Luggage" value={getLuggageLabel(option)} />
        <DetailLine icon={BadgeCheck} label="Providers" value={getProviderLabel(option) || "Normalized demo providers"} />
        <DetailLine
          icon={ShieldCheck}
          label="Cancellation"
          value={option.packageHoliday?.cancellationPolicy ?? option.accommodation.cancellationPolicy}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink/65">
          <span>{option.accommodation.roomType}</span>
          <span aria-hidden="true">|</span>
          <span>{option.accommodation.boardType}</span>
          <span aria-hidden="true">|</span>
          <span>Local transport {formatMoney(option.priceBreakdown.localTransport)}</span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-accentDark hover:shadow-soft"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Hide details" : "Show details"}
          <ChevronDown
            className={clsx("h-4 w-4 transition-transform duration-300", expanded && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      </div>

      {expanded ? (
        <div className="grid animate-fade-up gap-4 border-t border-line bg-[#fbf8f1] p-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Timeline items={option.timeline} segments={option.transportSegments} estimateLabel={estimateLabel} />

            <section className="rounded-lg border border-line bg-white/75 p-4">
              <h3 className="text-sm font-semibold text-ink">Stay and room allocation</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-md bg-paper p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/60">Accommodation</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{option.accommodation.name}</p>
                  <p className="mt-1 text-sm text-ink/60">
                    {option.accommodation.location} | {option.accommodation.nights} nights |{" "}
                    {option.accommodation.rating} rating
                  </p>
                </div>
                <div className="rounded-md bg-paper p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/60">Room plan</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{getRoomSummary(option.roomAllocation)}</p>
                  <p className="mt-1 text-sm text-ink/60">
                    {option.accommodation.occupancyExplanation ?? option.accommodation.childPolicy ?? "Age-aware occupancy estimate"}
                  </p>
                </div>
              </div>
            </section>

            {option.savingOpportunities.length > 0 ? (
              <section className="rounded-lg border border-sage/20 bg-sage/10 p-4">
                <h3 className="text-sm font-semibold text-ink">Savings opportunities</h3>
                <ul className="mt-3 grid gap-2">
                  {option.savingOpportunities.map((opportunity) => (
                    <li key={opportunity} className="flex gap-2 text-sm leading-5 text-ink/70">
                      <Star className="mt-0.5 h-4 w-4 shrink-0 text-sage" aria-hidden="true" />
                      {opportunity}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <div className="space-y-4">
            <CostBreakdown
              breakdown={option.priceBreakdown}
              assumptions={option.costAssumptions}
              estimateLabel={estimateLabel}
            />

            <section className="rounded-lg border border-line bg-white/75 p-4">
              <h3 className="text-sm font-semibold text-ink">Open at provider</h3>
              <p className="mt-1 text-xs text-ink/55">Each link opens the matching bookable component.</p>
              <div className="mt-3 grid gap-2">
                {providerActions.length > 0 ? (
                  providerActions.map((action) => (
                    <a
                      key={action.id}
                      href={action.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-between gap-3 rounded-md border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink transition hover:border-accent/30 hover:text-accentDark"
                      onClick={() => onOpenProvider?.(action)}
                    >
                      <span>{action.label}</span>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ))
                ) : (
                  <button
                    type="button"
                    className="inline-flex cursor-not-allowed items-center justify-between rounded-md border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink/60"
                    disabled
                  >
                    Open at provider
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function TripStat({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Plane;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-line bg-paper/70 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
        <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-ink">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/70 px-2 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

function DetailLine({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Plane;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-accentDark shadow-sm">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">{label}</p>
        <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

