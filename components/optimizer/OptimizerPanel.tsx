"use client";

import {
  ArrowRight,
  Banknote,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock,
  Gauge,
  Info,
  Leaf,
  Luggage,
  MapPin,
  Package,
  Plane,
  Route,
  SlidersHorizontal,
  Sparkles,
  TrendingDown
} from "lucide-react";
import type { ComponentType } from "react";

import { Tooltip } from "@/components/ui/Tooltip";
import {
  convertMoney,
  formatMoney,
  formatNumber,
  money,
  moneyFromPln,
  subtractMoney
} from "@/lib/currency";
import { DEFAULT_WEIGHTS } from "@/lib/defaults";
import type {
  Currency,
  Money,
  OptimizerWeights,
  SearchCriteria,
  SearchResults,
  TripOption
} from "@/lib/types";
import { formatDuration } from "@/lib/uiText";

type SliderKey = keyof OptimizerWeights;

export type OptimizerScenarioKind =
  | "separate-booking"
  | "package"
  | "berlin-departure"
  | "date-shift"
  | "room-luggage";

export type OptimizerScenario = {
  id: OptimizerScenarioKind | string;
  label: string;
  summary: string;
  totalPrice: Money;
  savings: Money;
  durationDeltaMinutes: number;
  scoreDelta: number;
  bullets: string[];
  kind: OptimizerScenarioKind;
};

export type OptimizerPanelProps = {
  weights: OptimizerWeights;
  onWeightsChange?: (weights: OptimizerWeights) => void;
  onChange?: (weights: OptimizerWeights) => void;
  selectedTrip?: TripOption | null;
  featuredTrip?: TripOption | null;
  comparedTrips?: TripOption[];
  results?: SearchResults | null;
  criteria?: SearchCriteria | null;
  currency?: Currency;
  comparisonScenarios?: OptimizerScenario[];
  selectedScenarioId?: string;
  onSelectedScenarioChange?: (scenarioId: string) => void;
  onResetWeights?: () => void;
  className?: string;
};

type SliderConfig = {
  key: SliderKey;
  label: string;
  caption: string;
  icon: ComponentType<{ className?: string }>;
};

type ScoreDriver = {
  key: SliderKey;
  label: string;
  raw: number;
  weight: number;
  points: number;
  detail: string;
};

const sliderConfigs: SliderConfig[] = [
  {
    key: "price",
    label: "Price",
    caption: "Lower total cost",
    icon: Banknote
  },
  {
    key: "travelTime",
    label: "Travel time",
    caption: "Shorter door-to-door route",
    icon: Clock
  },
  {
    key: "convenience",
    label: "Convenience",
    caption: "Transfers, luggage, package extras",
    icon: Route
  },
  {
    key: "hotelQuality",
    label: "Hotel quality",
    caption: "Rating and room fit",
    icon: BedDouble
  },
  {
    key: "sustainability",
    label: "Sustainability",
    caption: "Lower carbon estimate",
    icon: Leaf
  }
];

const scenarioIcons: Record<OptimizerScenarioKind, ComponentType<{ className?: string }>> = {
  "separate-booking": Plane,
  package: Package,
  "berlin-departure": MapPin,
  "date-shift": CalendarDays,
  "room-luggage": Luggage
};

export function OptimizerPanel({
  weights,
  onWeightsChange,
  onChange,
  selectedTrip,
  featuredTrip,
  comparedTrips = [],
  results,
  criteria,
  currency,
  comparisonScenarios,
  selectedScenarioId,
  onSelectedScenarioChange,
  onResetWeights,
  className = ""
}: OptimizerPanelProps) {
  const activeTrip = selectedTrip ?? featuredTrip ?? null;
  const handleWeightsChange = onWeightsChange ?? onChange ?? (() => undefined);
  const candidateTrips = results?.tripOptions ?? [activeTrip, ...comparedTrips].filter(BooleanTrip);
  const activeCurrency = getCurrency(activeTrip, results, criteria, currency);
  const scoreDrivers = activeTrip
    ? buildScoreDrivers(activeTrip, candidateTrips, weights)
    : buildEmptyScoreDrivers(weights);
  const recalculatedScore = Math.round(scoreDrivers.reduce((sum, driver) => sum + driver.points, 0));
  const scenarios =
    comparisonScenarios ??
    buildOptimizerScenarios({
      selectedTrip: activeTrip,
      results,
      tripOptions: candidateTrips,
      criteria,
      currency: activeCurrency
    });
  const activeScenarioId = selectedScenarioId ?? scenarios[0]?.id;
  const savings = buildSavingsList(activeTrip, scenarios);
  const weightTotal = getWeightTotal(weights);

  return (
    <section
      className={`space-y-5 rounded-[8px] border border-line bg-paper/95 p-4 shadow-soft sm:p-5 ${className}`}
      aria-label="Trip optimizer"
    >
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-accentDark">
            <SlidersHorizontal className="h-4 w-4" />
            Trip optimizer
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink">Tune the recommendation</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
            Adjust the priorities, then compare the fastest savings paths against the current trip.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-[8px] border border-line bg-white px-3 py-2 text-sm">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="font-semibold text-ink">{recalculatedScore}</span>
          <span className="text-ink/58">weighted score</span>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-4">
          <div className="grid gap-3">
            {sliderConfigs.map((item) => (
              <WeightSlider
                key={item.key}
                config={item}
                value={weights[item.key]}
                total={weightTotal}
                onChange={(value) => handleWeightsChange({ ...weights, [item.key]: value })}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-line bg-white px-3 py-3">
            <div className="flex items-center gap-2 text-sm text-ink/68">
              <Gauge className="h-4 w-4 text-sage" />
              <span>Weights normalize automatically from {formatNumber(weightTotal)} total points.</span>
            </div>
            {onResetWeights ? (
              <button
                type="button"
                onClick={onResetWeights}
                className="rounded-[8px] border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accentDark"
              >
                Reset
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleWeightsChange(DEFAULT_WEIGHTS)}
                className="rounded-[8px] border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accentDark"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <ScoreExplanation
          selectedTrip={activeTrip}
          score={recalculatedScore}
          scoreDrivers={scoreDrivers}
        />
      </div>

      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-ink">Comparison checks</h3>
              <p className="text-sm text-ink/62">Five optimizer agents, no new provider search.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-sageDark">
              <CheckCircle2 className="h-4 w-4 text-sage" />
              Agents ready
            </div>
          </div>

          <div className="grid gap-3">
            {scenarios.map((scenario) => (
              <ScenarioButton
                key={scenario.id}
                scenario={scenario}
                selected={scenario.id === activeScenarioId}
                currency={activeCurrency}
                onSelect={() => onSelectedScenarioChange?.(scenario.id)}
              />
            ))}
          </div>
        </div>

        <SavingsList items={savings} currency={activeCurrency} />
      </div>
    </section>
  );
}

function WeightSlider({
  config,
  value,
  total,
  onChange
}: {
  config: SliderConfig;
  value: number;
  total: number;
  onChange: (value: number) => void;
}) {
  const Icon = config.icon;
  const normalized = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <label className="block rounded-[8px] border border-line bg-white p-3 transition hover:border-accent/55">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-mist text-accentDark">
            <Icon className="h-4 w-4" />
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="block text-sm font-semibold text-ink">{config.label}</span>
            <Tooltip text={config.caption} />
          </span>
        </div>
        <span className="rounded-[8px] bg-ink px-2.5 py-1 text-xs font-semibold text-white">{normalized}%</span>
      </div>

      <input
        type="range"
        min={0}
        max={60}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 h-2 w-full cursor-pointer accent-accent"
        aria-label={`${config.label} priority`}
      />
    </label>
  );
}

function ScoreExplanation({
  selectedTrip,
  score,
  scoreDrivers
}: {
  selectedTrip?: TripOption | null;
  score: number;
  scoreDrivers: ScoreDriver[];
}) {
  return (
    <div className="rounded-[8px] border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">Score explanation</h3>
          <p className="mt-1 text-sm leading-6 text-ink/62">
            {selectedTrip?.scoreExplanation ?? "Select a trip to see weighted score drivers."}
          </p>
        </div>
        <div className="rounded-[8px] bg-accent px-3 py-2 text-center text-white">
          <div className="text-2xl font-semibold leading-none">{score}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-white/78">score</div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {scoreDrivers.map((driver) => (
          <div key={driver.key}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-ink">{driver.label}</span>
              <span className="text-ink/60">
                {formatNumber(driver.raw)} x {driver.weight}% = {formatNumber(driver.points)}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-mist">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.max(4, Math.min(100, driver.raw))}%` }}
              />
            </div>
            <p className="mt-1 text-xs leading-5 text-ink/56">{driver.detail}</p>
          </div>
        ))}
      </div>

      {selectedTrip?.recommendationReasons?.length ? (
        <div className="mt-4 rounded-[8px] bg-mist p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Info className="h-4 w-4 text-accentDark" />
            Why this trip
          </div>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-ink/68">
            {selectedTrip.recommendationReasons.slice(0, 3).map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ScenarioButton({
  scenario,
  selected,
  currency,
  onSelect
}: {
  scenario: OptimizerScenario;
  selected: boolean;
  currency: Currency;
  onSelect: () => void;
}) {
  const Icon = scenarioIcons[scenario.kind] ?? Sparkles;
  const savings = convertMoney(scenario.savings, currency);
  const hasSavings = savings.amount > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group rounded-[8px] border p-4 text-left transition ${
        selected ? "border-accent bg-white shadow-soft" : "border-line bg-white/82 hover:border-accent/55 hover:bg-white"
      }`}
      aria-pressed={selected}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] ${
            selected ? "bg-accent text-white" : "bg-mist text-accentDark"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="font-semibold text-ink">{scenario.label}</span>
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-ink/36 transition group-hover:translate-x-0.5 group-hover:text-accentDark" />
          </span>
          <span className="mt-1 block text-sm leading-6 text-ink/62">{scenario.summary}</span>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-[8px] bg-mist px-3 py-2">
          <div className="text-xs text-ink/52">Total</div>
          <div className="mt-1 font-semibold text-ink">{formatMoney(convertMoney(scenario.totalPrice, currency))}</div>
        </div>
        <div className="rounded-[8px] bg-mist px-3 py-2">
          <div className="text-xs text-ink/52">{hasSavings ? "Saves" : "Delta"}</div>
          <div className={`mt-1 font-semibold ${hasSavings ? "text-sageDark" : "text-ink"}`}>
            {hasSavings ? formatMoney(savings) : formatMoney(savings)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-white px-2.5 py-1 text-ink/62 ring-1 ring-line">
          {scenario.durationDeltaMinutes === 0
            ? "Same travel time"
            : `${scenario.durationDeltaMinutes > 0 ? "+" : ""}${formatDuration(Math.abs(scenario.durationDeltaMinutes))}`}
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 text-ink/62 ring-1 ring-line">
          {scenario.scoreDelta >= 0 ? "+" : ""}
          {scenario.scoreDelta} score
        </span>
      </div>

      {selected ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/66">
          {scenario.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-sage" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </button>
  );
}

function SavingsList({ items, currency }: { items: SavingsOpportunity[]; currency: Currency }) {
  return (
    <div className="rounded-[8px] border border-line bg-white p-4">
      <div className="flex items-center gap-2">
        <TrendingDown className="h-5 w-5 text-sage" />
        <h3 className="text-lg font-semibold text-ink">Savings opportunities</h3>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="border-b border-line pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-ink">{item.label}</div>
                <p className="mt-1 text-sm leading-6 text-ink/62">{item.detail}</p>
              </div>
              {item.savings.amount > 0 ? (
                <span className="shrink-0 rounded-[8px] bg-sage px-2.5 py-1 text-xs font-semibold text-white">
                  {formatMoney(convertMoney(item.savings, currency))}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type SavingsOpportunity = {
  label: string;
  detail: string;
  savings: Money;
};

function buildSavingsList(selectedTrip: TripOption | null | undefined, scenarios: OptimizerScenario[]): SavingsOpportunity[] {
  const scenarioItems = scenarios
    .filter((scenario) => scenario.savings.amount > 0)
    .sort((left, right) => right.savings.amount - left.savings.amount)
    .slice(0, 3)
    .map((scenario) => ({
      label: scenario.label,
      detail: scenario.summary,
      savings: scenario.savings
    }));

  const tripItems =
    selectedTrip?.savingOpportunities.slice(0, Math.max(0, 5 - scenarioItems.length)).map((item, index) => ({
      label: `Trip note ${index + 1}`,
      detail: item,
      savings: money(0, selectedTrip.totalPrice.currency)
    })) ?? [];

  const items = [...scenarioItems, ...tripItems];

  if (items.length > 0) {
    return items;
  }

  return [
    {
      label: "Flexible date check",
      detail: "Try nearby dates once search results are available.",
      savings: moneyFromPln(0, "PLN")
    },
    {
      label: "Room and luggage check",
      detail: "Compare family room, two-room split, and checked bag bundles.",
      savings: moneyFromPln(0, "PLN")
    }
  ];
}

function buildScoreDrivers(
  selectedTrip: TripOption,
  candidates: TripOption[],
  weights: OptimizerWeights
): ScoreDriver[] {
  const total = getWeightTotal(weights);
  const pool = candidates.length > 0 ? candidates : [selectedTrip];
  const currency = selectedTrip.totalPrice.currency;
  const prices = pool.map((trip) => convertMoney(trip.totalPrice, currency).amount);
  const durations = pool.map((trip) => trip.totalDurationMinutes);
  const carbons = pool.map((trip) => trip.carbonKg);
  const selectedPrice = convertMoney(selectedTrip.totalPrice, currency).amount;
  const selectedDuration = selectedTrip.totalDurationMinutes;
  const selectedCarbon = selectedTrip.carbonKg;
  const convenience = clampScore(100 - selectedTrip.transfers * 16 + (selectedTrip.packageHoliday?.airportTransferIncluded ? 8 : 0));
  const hotelQuality = clampScore((selectedTrip.accommodation.rating / 5) * 100);

  const rawScores: Record<SliderKey, { raw: number; detail: string }> = {
    price: {
      raw: inverseRangeScore(selectedPrice, prices),
      detail: `${formatMoney(selectedTrip.totalPrice)} total, benchmarked against visible trip options.`
    },
    travelTime: {
      raw: inverseRangeScore(selectedDuration, durations),
      detail: `${formatDuration(selectedDuration)} door-to-door travel time.`
    },
    convenience: {
      raw: convenience,
      detail: `${selectedTrip.transfers} transfer${selectedTrip.transfers === 1 ? "" : "s"} with ${
        selectedTrip.transportOption?.luggageIncluded || selectedTrip.packageHoliday?.luggageIncluded
          ? "luggage included"
          : "luggage priced separately"
      }.`
    },
    hotelQuality: {
      raw: hotelQuality,
      detail: `${selectedTrip.accommodation.name}, ${selectedTrip.accommodation.rating.toFixed(1)} rating.`
    },
    sustainability: {
      raw: inverseRangeScore(selectedCarbon, carbons),
      detail: `${formatNumber(selectedCarbon)} kg estimated CO2 for the trip.`
    }
  };

  return sliderConfigs.map((config) => {
    const weight = total > 0 ? Math.round((weights[config.key] / total) * 100) : 0;
    const raw = Math.round(rawScores[config.key].raw);

    return {
      key: config.key,
      label: config.label,
      raw,
      weight,
      points: Math.round((raw * weight) / 100),
      detail: rawScores[config.key].detail
    };
  });
}

function buildEmptyScoreDrivers(weights: OptimizerWeights): ScoreDriver[] {
  const total = getWeightTotal(weights);

  return sliderConfigs.map((config) => {
    const weight = total > 0 ? Math.round((weights[config.key] / total) * 100) : 0;

    return {
      key: config.key,
      label: config.label,
      raw: 0,
      weight,
      points: 0,
      detail: "Waiting for a selected trip."
    };
  });
}

function buildOptimizerScenarios({
  selectedTrip,
  results,
  tripOptions,
  criteria,
  currency
}: {
  selectedTrip?: TripOption | null;
  results?: SearchResults | null;
  tripOptions?: TripOption[];
  criteria?: SearchCriteria | null;
  currency: Currency;
}): OptimizerScenario[] {
  if (!selectedTrip) {
    return emptyScenarios(currency);
  }

  const availableTrips = tripOptions ?? results?.tripOptions;
  const separateTrip = findBestTrip(availableTrips, "self-organized");
  const packageTrip = findBestTrip(availableTrips, "package");
  const selectedTotal = convertMoney(selectedTrip.totalPrice, currency);

  return [
    scenarioFromTrip({
      id: "separate-booking",
      label: "Separate booking",
      summary: "Transport and stay priced as independent components.",
      kind: "separate-booking",
      selectedTrip,
      candidate: separateTrip,
      currency,
      fallbackPercent: selectedTrip.kind === "self-organized" ? 0 : -5,
      fallbackDurationDelta: selectedTrip.kind === "self-organized" ? 0 : 35,
      bullets: [
        "Keeps flight, hotel, and local transfer assumptions visible.",
        "Best when cancellation flexibility matters more than one checkout.",
        "Uses the existing complete-trip result when available."
      ]
    }),
    scenarioFromTrip({
      id: "package",
      label: "Package holiday",
      summary: "Bundled operator fare with hotel, luggage, and airport transfer checks.",
      kind: "package",
      selectedTrip,
      candidate: packageTrip,
      currency,
      fallbackPercent: selectedTrip.kind === "package" ? 0 : -4,
      fallbackDurationDelta: selectedTrip.kind === "package" ? 0 : -20,
      bullets: [
        "Highlights child discounts and room supplements from package pricing.",
        "Good candidate when transfer and checked luggage are included.",
        "Uses the existing package result when available."
      ]
    }),
    buildEstimatedScenario({
      id: "berlin-departure",
      label: "Berlin departure",
      summary: `Depart from Berlin instead of ${criteria?.origin || "the selected origin"} to widen flight supply.`,
      kind: "berlin-departure",
      selectedTrip,
      currency,
      priceMultiplier: 0.92,
      durationDeltaMinutes: 135,
      scoreDelta: -2,
      bullets: [
        "Adds transfer time to the departure airport.",
        "Often improves flight frequency for Szczecin-area trips.",
        "Keeps accommodation and traveler pricing unchanged."
      ]
    }),
    buildEstimatedScenario({
      id: "date-shift",
      label: "Date shift",
      summary: "Move departure by one or two days while keeping the same trip length.",
      kind: "date-shift",
      selectedTrip,
      currency,
      priceMultiplier: criteria?.flexibleDates ? 0.94 : 0.97,
      durationDeltaMinutes: 0,
      scoreDelta: criteria?.flexibleDates ? 4 : 2,
      bullets: [
        "Checks nearby dates against the same traveler and room setup.",
        "Keeps the seven-night pattern intact.",
        "Best for flexible-date searches."
      ]
    }),
    buildEstimatedScenario({
      id: "room-luggage",
      label: "Room and luggage",
      summary: "Compare family room, two-room split, and checked-bag bundles.",
      kind: "room-luggage",
      selectedTrip,
      currency,
      priceMultiplier: selectedTrip.transportOption?.luggageIncluded || selectedTrip.packageHoliday?.luggageIncluded ? 0.98 : 0.95,
      durationDeltaMinutes: 0,
      scoreDelta: 3,
      bullets: [
        "Tests whether one family room beats two cheaper rooms.",
        "Compares included bags against one shared checked bag.",
        "Preserves adjacent seats and rooms when required."
      ]
    })
  ].map((scenario) => ({
    ...scenario,
    totalPrice: scenario.totalPrice.currency === currency ? scenario.totalPrice : convertMoney(scenario.totalPrice, currency),
    savings: scenario.savings.currency === currency ? scenario.savings : convertMoney(scenario.savings, currency)
  }));

  function buildEstimatedScenario(options: {
    id: OptimizerScenarioKind;
    label: string;
    summary: string;
    kind: OptimizerScenarioKind;
    selectedTrip: TripOption;
    currency: Currency;
    priceMultiplier: number;
    durationDeltaMinutes: number;
    scoreDelta: number;
    bullets: string[];
  }): OptimizerScenario {
    const totalPrice = money(Math.round(selectedTotal.amount * options.priceMultiplier), options.currency);
    const savings = subtractMoney(selectedTotal, totalPrice);

    return {
      id: options.id,
      label: options.label,
      summary: options.summary,
      totalPrice,
      savings,
      durationDeltaMinutes: options.durationDeltaMinutes,
      scoreDelta: options.scoreDelta,
      bullets: options.bullets,
      kind: options.kind
    };
  }
}

function scenarioFromTrip(options: {
  id: OptimizerScenarioKind;
  label: string;
  summary: string;
  kind: OptimizerScenarioKind;
  selectedTrip: TripOption;
  candidate?: TripOption;
  currency: Currency;
  fallbackPercent: number;
  fallbackDurationDelta: number;
  bullets: string[];
}): OptimizerScenario {
  const selectedTotal = convertMoney(options.selectedTrip.totalPrice, options.currency);

  if (options.candidate) {
    const candidateTotal = convertMoney(options.candidate.totalPrice, options.currency);

    return {
      id: options.id,
      label: options.label,
      summary: options.summary,
      totalPrice: candidateTotal,
      savings: subtractMoney(selectedTotal, candidateTotal),
      durationDeltaMinutes: options.candidate.totalDurationMinutes - options.selectedTrip.totalDurationMinutes,
      scoreDelta: Math.round(options.candidate.score - options.selectedTrip.score),
      bullets: options.bullets,
      kind: options.kind
    };
  }

  const totalPrice = money(Math.round(selectedTotal.amount * (1 + options.fallbackPercent / 100)), options.currency);

  return {
    id: options.id,
    label: options.label,
    summary: options.summary,
    totalPrice,
    savings: subtractMoney(selectedTotal, totalPrice),
    durationDeltaMinutes: options.fallbackDurationDelta,
    scoreDelta: options.fallbackPercent < 0 ? 1 : 0,
    bullets: options.bullets,
    kind: options.kind
  };
}

function emptyScenarios(currency: Currency): OptimizerScenario[] {
  const zero = money(0, currency);

  return [
    {
      id: "separate-booking",
      label: "Separate booking",
      summary: "Available after a trip is selected.",
      totalPrice: zero,
      savings: zero,
      durationDeltaMinutes: 0,
      scoreDelta: 0,
      bullets: ["Select a trip to compare transport and accommodation separately."],
      kind: "separate-booking"
    },
    {
      id: "package",
      label: "Package holiday",
      summary: "Available after a trip is selected.",
      totalPrice: zero,
      savings: zero,
      durationDeltaMinutes: 0,
      scoreDelta: 0,
      bullets: ["Select a trip to compare bundled package pricing."],
      kind: "package"
    }
  ];
}

function findBestTrip(trips: TripOption[] | undefined, kind: TripOption["kind"]): TripOption | undefined {
  return trips
    ?.filter((trip) => trip.kind === kind)
    .sort((left, right) => left.totalPrice.amount - right.totalPrice.amount)[0];
}

function inverseRangeScore(value: number, values: number[]): number {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return 50;
  }

  if (min === max) {
    return 88;
  }

  return clampScore(((max - value) / (max - min)) * 100);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function getWeightTotal(weights: OptimizerWeights): number {
  return Math.max(1, sliderConfigs.reduce((sum, config) => sum + weights[config.key], 0));
}

function getCurrency(
  selectedTrip?: TripOption | null,
  results?: SearchResults | null,
  criteria?: SearchCriteria | null,
  currency?: Currency
): Currency {
  return currency ?? selectedTrip?.totalPrice.currency ?? results?.criteria.currency ?? criteria?.currency ?? "PLN";
}

function BooleanTrip(trip: TripOption | null | undefined): trip is TripOption {
  return Boolean(trip);
}

