"use client";

import { Banknote, BedDouble, Clock, Leaf, Loader2, RefreshCcw, RotateCcw, Route, Sparkles } from "lucide-react";
import type { ComponentType } from "react";

import { Tooltip } from "@/components/ui/Tooltip";
import { formatMoney, formatNumber } from "@/lib/currency";
import { DEFAULT_WEIGHTS } from "@/lib/defaults";
import type { OptimizerWeights, TripOption } from "@/lib/types";
import { formatDuration } from "@/lib/uiText";

type SliderKey = keyof OptimizerWeights;

export type OptimizerPanelProps = {
  weights: OptimizerWeights;
  onChange: (weights: OptimizerWeights) => void;
  selectedTrip?: TripOption | null;
  featuredTrip?: TripOption | null;
  comparedTrips?: TripOption[];
  className?: string;
  // Surfaced from the Trip Optimizer agent card (now shown in the right
  // column) so its "Review updated ranking" trigger can live here instead,
  // right where the priorities that would change it are actually set.
  hasChanges?: boolean;
  isReviewing?: boolean;
  onRequestReview?: () => void;
};

type PriorityConfig = {
  key: SliderKey;
  label: string;
  caption: string;
  icon: ComponentType<{ className?: string }>;
};

type ScoreDriver = {
  key: SliderKey;
  label: string;
  raw: number;
  points: number;
  detail: string;
};

// Three plain-language levels instead of a free-dragging 0-60 slider whose
// displayed percentage recalculates for every OTHER slider too (moving
// "Price" silently changed the number next to "Hotel quality") — that's
// the "disorienting percents" a lay user has no reason to untangle. Picking
// a level sets one clear, fixed number; nothing you didn't touch changes.
// Matches weightsFromPreferences' base/boost numbers (lib/adapters/criteria.ts)
// exactly, so a weight set from the search wizard's checkboxes lands
// precisely on a tier here instead of an approximate "nearest" match.
const TIER_VALUES = { low: 10, balanced: 25, high: 40 } as const;
type Tier = keyof typeof TIER_VALUES;
const TIERS: Tier[] = ["low", "balanced", "high"];
const TIER_LABELS: Record<Tier, string> = { low: "Low", balanced: "Balanced", high: "High" };

function nearestTier(value: number): Tier {
  return TIERS.reduce((closest, tier) =>
    Math.abs(TIER_VALUES[tier] - value) < Math.abs(TIER_VALUES[closest] - value) ? tier : closest
  );
}

const priorityConfigs: PriorityConfig[] = [
  { key: "price", label: "Price", caption: "How much lower total cost matters", icon: Banknote },
  { key: "travelTime", label: "Travel time", caption: "How much a shorter door-to-door trip matters", icon: Clock },
  { key: "convenience", label: "Convenience", caption: "How much fewer transfers and included luggage matter", icon: Route },
  { key: "hotelQuality", label: "Hotel quality", caption: "How much rating and room fit matter", icon: BedDouble },
  { key: "sustainability", label: "Sustainability", caption: "How much a lower carbon estimate matters", icon: Leaf }
];

export function OptimizerPanel({
  weights,
  onChange,
  selectedTrip,
  featuredTrip,
  comparedTrips = [],
  className = "",
  hasChanges = false,
  isReviewing = false,
  onRequestReview
}: OptimizerPanelProps) {
  const activeTrip = selectedTrip ?? featuredTrip ?? null;
  const candidatePool = [activeTrip, ...comparedTrips].filter(isTripOption);
  const scoreDrivers = activeTrip ? buildScoreDrivers(activeTrip, candidatePool, weights) : [];
  const score = activeTrip ? Math.round(scoreDrivers.reduce((sum, driver) => sum + driver.points, 0)) : null;

  return (
    <section
      className={`space-y-5 rounded-[8px] border border-line bg-paper/95 p-4 shadow-soft sm:p-5 ${className}`}
      aria-label="Trip optimizer"
    >
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-ink">What matters most?</h2>
          <p className="mt-1 text-sm leading-6 text-ink/62">Set your priorities — the recommended trip updates instantly.</p>
        </div>
        {score !== null ? (
          <div className="flex shrink-0 items-center gap-2 rounded-[8px] bg-accent px-3 py-2 text-white">
            <Sparkles className="h-4 w-4" />
            <span className="text-lg font-bold leading-none">{score}</span>
            <span className="text-xs font-medium text-white/80">/ 100</span>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {priorityConfigs.map((config) => (
          <PriorityRow
            key={config.key}
            config={config}
            tier={nearestTier(weights[config.key])}
            onSelect={(tier) => onChange({ ...weights, [config.key]: TIER_VALUES[tier] })}
          />
        ))}

        <button
          type="button"
          onClick={() => onChange(DEFAULT_WEIGHTS)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/55 transition hover:text-accentDark"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to defaults
        </button>

        {hasChanges && onRequestReview ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onRequestReview}
              disabled={isReviewing}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-accentDark disabled:cursor-wait disabled:opacity-60"
            >
              {isReviewing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              {isReviewing ? "Reviewing..." : "Review updated ranking"}
            </button>
          </div>
        ) : null}
      </div>

      {activeTrip ? (
        <div className="space-y-4 border-t border-line pt-4">
          <h3 className="text-sm font-semibold text-ink">How the recommended trip scores</h3>
          <div className="space-y-3">
            {scoreDrivers.map((driver) => (
              <div key={driver.key}>
                <div className="flex items-center justify-between gap-3 text-sm font-medium text-ink">
                  <span>{driver.label}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-mist">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(4, Math.min(100, driver.raw))}%` }} />
                </div>
                <p className="mt-1 text-xs leading-5 text-ink/56">{driver.detail}</p>
              </div>
            ))}
          </div>

          {activeTrip.recommendationReasons.length > 0 ? (
            <div className="rounded-[8px] bg-mist p-3">
              <p className="text-sm font-semibold text-ink">Why this trip</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-ink/68">
                {activeTrip.recommendationReasons.slice(0, 3).map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {activeTrip.savingOpportunities.length > 0 ? (
            <div className="rounded-[8px] border border-line bg-white p-3">
              <p className="text-sm font-semibold text-ink">Worth checking</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-ink/68">
                {activeTrip.savingOpportunities.map((note) => (
                  <li key={note} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PriorityRow({
  config,
  tier,
  onSelect
}: {
  config: PriorityConfig;
  tier: Tier;
  onSelect: (tier: Tier) => void;
}) {
  const Icon = config.icon;

  return (
    <div className="rounded-[8px] border border-line bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-mist text-accentDark">
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="text-sm font-semibold text-ink">{config.label}</span>
          <Tooltip text={config.caption} />
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label={`${config.label} priority`}>
        {TIERS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={tier === option}
            onClick={() => onSelect(option)}
            className={`rounded-[6px] py-1.5 text-sm font-semibold transition ${
              tier === option ? "bg-accent text-white" : "bg-mist text-ink/60 hover:bg-mist/70 hover:text-ink"
            }`}
          >
            {TIER_LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

function buildScoreDrivers(selectedTrip: TripOption, pool: TripOption[], weights: OptimizerWeights): ScoreDriver[] {
  const candidates = pool.length > 0 ? pool : [selectedTrip];
  const currency = selectedTrip.totalPrice.currency;
  const prices = candidates.map((trip) => (trip.totalPrice.currency === currency ? trip.totalPrice.amount : selectedTrip.totalPrice.amount));
  const durations = candidates.map((trip) => trip.totalDurationMinutes);
  const carbons = candidates.map((trip) => trip.carbonKg);
  const total = Math.max(1, priorityConfigs.reduce((sum, config) => sum + weights[config.key], 0));

  const convenience = clampScore(100 - selectedTrip.transfers * 16 + (selectedTrip.packageHoliday?.airportTransferIncluded ? 8 : 0));
  const hotelQuality = clampScore((selectedTrip.accommodation.rating / 5) * 100);
  const luggageIncluded = selectedTrip.transportOption?.luggageIncluded || selectedTrip.packageHoliday?.luggageIncluded;

  const raw: Record<SliderKey, { value: number; detail: string }> = {
    price: {
      value: inverseRangeScore(selectedTrip.totalPrice.amount, prices),
      detail: `${formatMoney(selectedTrip.totalPrice)} total, benchmarked against the trips you're comparing.`
    },
    travelTime: {
      value: inverseRangeScore(selectedTrip.totalDurationMinutes, durations),
      detail: `${formatDuration(selectedTrip.totalDurationMinutes)} door-to-door travel time.`
    },
    convenience: {
      value: convenience,
      detail: `${selectedTrip.transfers} transfer${selectedTrip.transfers === 1 ? "" : "s"}, ${luggageIncluded ? "luggage included" : "luggage priced separately"}.`
    },
    hotelQuality: {
      value: hotelQuality,
      detail: `${selectedTrip.accommodation.name}, ${selectedTrip.accommodation.rating.toFixed(1)} rating.`
    },
    sustainability: {
      value: inverseRangeScore(selectedTrip.carbonKg, carbons),
      detail: `${formatNumber(selectedTrip.carbonKg)} kg estimated CO2 for the trip.`
    }
  };

  return priorityConfigs.map((config) => {
    const weightShare = weights[config.key] / total;
    const value = Math.round(raw[config.key].value);

    return {
      key: config.key,
      label: config.label,
      raw: value,
      points: Math.round(value * weightShare),
      detail: raw[config.key].detail
    };
  });
}

function inverseRangeScore(value: number, values: number[]): number {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return 50;
  if (min === max) return 88;

  return clampScore(((max - value) / (max - min)) * 100);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function isTripOption(trip: TripOption | null | undefined): trip is TripOption {
  return Boolean(trip);
}
