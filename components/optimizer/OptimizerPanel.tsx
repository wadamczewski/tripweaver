"use client";

import { Banknote, BedDouble, Clock, Leaf, Loader2, RefreshCcw, RotateCcw, Route, Sparkles } from "lucide-react";
import type { ComponentType } from "react";

import { Tooltip } from "@/components/ui/Tooltip";
import { DEFAULT_WEIGHTS } from "@/lib/defaults";
import type { OptimizerWeights, TripOption } from "@/lib/types";

type SliderKey = keyof OptimizerWeights;

export type OptimizerPanelProps = {
  weights: OptimizerWeights;
  onChange: (weights: OptimizerWeights) => void;
  featuredTrip?: TripOption | null;
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
  featuredTrip,
  className = "",
  hasChanges = false,
  isReviewing = false,
  onRequestReview
}: OptimizerPanelProps) {
  const score = featuredTrip ? featuredTrip.score : null;

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
        <div className="grid grid-cols-2 gap-2">
          {priorityConfigs.map((config) => (
            <PriorityRow
              key={config.key}
              config={config}
              tier={nearestTier(weights[config.key])}
              onSelect={(tier) => onChange({ ...weights, [config.key]: TIER_VALUES[tier] })}
            />
          ))}
        </div>

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
    <div className="rounded-[8px] border border-line bg-white p-2">
      <div className="flex items-center gap-1.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-mist text-accentDark">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate text-xs font-semibold text-ink">{config.label}</span>
          <Tooltip text={config.caption} />
        </span>
      </div>

      <div className="mt-1.5 grid grid-cols-3 gap-1" role="group" aria-label={`${config.label} priority`}>
        {TIERS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={tier === option}
            onClick={() => onSelect(option)}
            className={`rounded-[6px] py-1 text-[11px] font-semibold transition ${
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
