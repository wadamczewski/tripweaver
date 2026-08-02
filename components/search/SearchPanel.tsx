"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bus,
  Building2,
  CalendarDays,
  Car,
  Check,
  Hotel,
  Luggage,
  MapPin,
  PackageCheck,
  Plane,
  Route,
  Search,
  Settings2,
  Ship,
  Sparkles,
  Star,
  Train,
  WalletCards
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

import { convertMoney, formatMoney } from "@/lib/currency";
import { DEFAULT_TRANSPORT_MODES, summarizeTravelers } from "@/lib/defaults";
import type { Currency, PreferenceKey, SearchCriteria, TransportMode } from "@/lib/types";
import { validateSearchCriteria } from "@/lib/validation";

import { CityAutocomplete } from "@/components/ui/CityAutocomplete";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { Tooltip } from "@/components/ui/Tooltip";

import { RoomAllocator } from "./RoomAllocator";
import { TravelerSelector } from "./TravelerSelector";
import {
  ACCOMMODATION_OPTIONS,
  buildRoomsForTravelers,
  cn,
  PREFERENCE_OPTIONS,
  roomAffectingTravelerShapeChanged,
  TRANSPORT_OPTIONS
} from "./searchUtils";

export type SearchPanelProps = {
  criteria: SearchCriteria;
  onCriteriaChange?: (criteria: SearchCriteria) => void;
  onChange?: (criteria: SearchCriteria) => void;
  onSubmit: (criteria: SearchCriteria) => void | Promise<void>;
  validationErrors?: string[];
  errors?: string[];
  isSubmitting?: boolean;
  isLoading?: boolean;
  submitLabel?: string;
  className?: string;
};

type WizardStepId = "route" | "travelers" | "preferences" | "review";

const CURRENCIES: Currency[] = ["PLN", "EUR"];

const wizardSteps: Array<{
  id: WizardStepId;
  title: string;
  eyebrow: string;
  description: string;
}> = [
  {
    id: "route",
    title: "Where and when?",
    eyebrow: "Step 1",
    description: "Set the route, dates, and whether TripWeaver can check nearby dates."
  },
  {
    id: "travelers",
    title: "Who is traveling?",
    eyebrow: "Step 2",
    description: "Add ages and room allocation so every provider prices the same group correctly."
  },
  {
    id: "preferences",
    title: "What matters most?",
    eyebrow: "Step 3",
    description: "Choose transport, stay type, budget, luggage, packages, and optimization priorities."
  },
  {
    id: "review",
    title: "Ready to compare",
    eyebrow: "Step 4",
    description: "Review the trip brief, then run the complete comparison."
  }
];

const transportIcons: Record<TransportMode, ReactNode> = {
  flight: <Plane className="h-4 w-4" aria-hidden="true" />,
  train: <Train className="h-4 w-4" aria-hidden="true" />,
  bus: <Bus className="h-4 w-4" aria-hidden="true" />,
  car: <Car className="h-4 w-4" aria-hidden="true" />,
  ferry: <Ship className="h-4 w-4" aria-hidden="true" />,
  transfer: <Route className="h-4 w-4" aria-hidden="true" />
};

export function SearchPanel({
  criteria,
  onCriteriaChange,
  onChange,
  onSubmit,
  validationErrors,
  errors,
  isSubmitting = false,
  isLoading = false,
  submitLabel = "Find my trip",
  className
}: SearchPanelProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const computedErrors = useMemo(() => validateSearchCriteria(criteria), [criteria]);
  const externalErrors = validationErrors ?? errors;
  const visibleErrors = externalErrors ?? (submitAttempted ? computedErrors : []);
  const loading = isSubmitting || isLoading;
  const currentStep = wizardSteps[activeStep];
  const isLastStep = activeStep === wizardSteps.length - 1;

  function updateCriteria(patch: Partial<SearchCriteria>): void {
    const nextCriteria = {
      ...criteria,
      ...patch
    };

    (onCriteriaChange ?? onChange)?.(nextCriteria);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitAttempted(true);

    if (!isLastStep) {
      setActiveStep((step) => Math.min(wizardSteps.length - 1, step + 1));
      return;
    }

    if (computedErrors.length > 0) {
      return;
    }

    void onSubmit(criteria);
  }

  function updateCurrency(currency: Currency): void {
    updateCriteria({
      currency,
      budget: criteria.budget ? convertMoney(criteria.budget, currency) : undefined,
      budgetMin: criteria.budgetMin ? convertMoney(criteria.budgetMin, currency) : undefined
    });
  }

  function updateBudgetRange(min: number, max: number): void {
    updateCriteria({
      budgetMin: { amount: min, currency: criteria.currency },
      budget: { amount: max, currency: criteria.currency }
    });
  }

  function toggleTransportMode(mode: TransportMode): void {
    const selectedTransportModes = criteria.selectedTransportModes.includes(mode)
      ? criteria.selectedTransportModes.filter((selectedMode) => selectedMode !== mode)
      : [...criteria.selectedTransportModes, mode];

    updateCriteria({ selectedTransportModes });
  }

  function togglePreference(preference: PreferenceKey): void {
    const preferences = criteria.preferences.includes(preference)
      ? criteria.preferences.filter((selectedPreference) => selectedPreference !== preference)
      : [...criteria.preferences, preference];

    updateCriteria({ preferences });
  }

  return (
    <form
      className={cn(
        "min-w-0 overflow-hidden rounded-[30px] border border-white/70 bg-white/92 shadow-[0_30px_90px_rgba(15,23,42,0.18)] backdrop-blur-xl",
        className
      )}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="bg-ink p-5 text-white lg:p-6">

          <div className="mt-7 grid grid-cols-1 gap-2 sm:space-y-2">
            {wizardSteps.map((step, index) => {
              const isActive = index === activeStep;
              const isDone = index < activeStep;

              return (
                <button
                  type="button"
                  key={step.id}
                  onClick={() => setActiveStep(index)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition",
                    isActive ? "bg-white text-ink shadow-soft" : "text-white/66 hover:bg-white/8 hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                      isActive ? "bg-accent text-white" : isDone ? "bg-sage text-white" : "bg-white/10 text-white/62"
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{step.title}</span>
                    <span className={cn("mt-1 hidden text-xs leading-5 sm:block", isActive ? "text-ink/56" : "text-white/44")}>
                      {step.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 bg-[#fbf7ef]">
          <div className="border-b border-line/80 px-5 py-5 sm:px-7">
            <div className="animate-fade-up" key={currentStep.id}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accentDark">{currentStep.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{currentStep.title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#566273]">{currentStep.description}</p>
            </div>
          </div>

          <div className="min-w-0 p-5 sm:p-7">
            <div className="min-h-[420px] animate-fade-up" key={currentStep.id}>
              {currentStep.id === "route" ? (
                <RouteStep criteria={criteria} updateCriteria={updateCriteria} />
              ) : null}

              {currentStep.id === "travelers" ? (
                <TravelersStep criteria={criteria} updateCriteria={updateCriteria} />
              ) : null}

              {currentStep.id === "preferences" ? (
                <PreferencesStep
                  criteria={criteria}
                  updateCriteria={updateCriteria}
                  updateBudgetRange={updateBudgetRange}
                  updateCurrency={updateCurrency}
                  togglePreference={togglePreference}
                  toggleTransportMode={toggleTransportMode}
                />
              ) : null}

              {currentStep.id === "review" ? <ReviewStep criteria={criteria} errors={computedErrors} /> : null}
            </div>

            {visibleErrors.length > 0 ? (
              <div className="mt-5 rounded-2xl border border-accent/25 bg-white p-4 text-sm shadow-soft" role="alert">
                <div className="mb-2 flex items-center gap-2 font-bold text-accentDark">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Check these details before searching
                </div>
                <ul className="space-y-1 text-ink/72">
                  {visibleErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 border-t border-line/80 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={activeStep === 0 || loading}
                onClick={() => setActiveStep((step) => Math.max(0, step - 1))}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-bold text-ink transition duration-200 hover:-translate-x-0.5 hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-x-0"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>

              <div className="flex items-center justify-center gap-2">
                {wizardSteps.map((step, index) => (
                  <span
                    key={step.id}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      index === activeStep ? "w-8 bg-accent" : index < activeStep ? "w-4 bg-sage" : "w-2 bg-line"
                    )}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white shadow-soft transition duration-200 ease-springy hover:-translate-y-0.5 hover:bg-accentDark hover:shadow-lift active:translate-y-0 disabled:cursor-wait disabled:bg-ink/35 disabled:hover:translate-y-0"
                disabled={loading}
              >
                {loading ? (
                  <Search className="h-4 w-4 animate-pulse" aria-hidden="true" />
                ) : isLastStep ? (
                  <Search className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                )}
                {loading ? "Finding options" : isLastStep ? submitLabel : "Continue"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}

function RouteStep({
  criteria,
  updateCriteria
}: {
  criteria: SearchCriteria;
  updateCriteria: (patch: Partial<SearchCriteria>) => void;
}) {
  return (
    <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)]">
          <CityAutocomplete
            label="Departure city"
            value={criteria.origin}
            onChange={(value) => updateCriteria({ origin: value })}
            placeholder="Szczecin"
          />
          <div className="hidden md:flex md:flex-col">
            <span className="invisible mb-2 flex items-center gap-2 text-sm font-semibold" aria-hidden="true">
              <MapPin className="h-4 w-4" />
              Route
            </span>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-accent shadow-sm">
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <CityAutocomplete
            label="Destination"
            value={criteria.destination}
            onChange={(value) => updateCriteria({ destination: value })}
            placeholder="Barcelona or Anywhere"
            allowAnywhere
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
          <TextField
            label="Departure date"
            icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
            type="date"
            value={criteria.departureDate}
            onChange={(value) => updateCriteria({ departureDate: value })}
          />
          <TextField
            label="Return date"
            icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
            type="date"
            value={criteria.returnDate}
            onChange={(value) => updateCriteria({ returnDate: value })}
          />
          <div className="flex flex-col">
            <span className="invisible mb-2 flex items-center gap-2 text-sm font-semibold" aria-hidden="true">
              <CalendarDays className="h-4 w-4" />
              Flexible
            </span>
            <SwitchTile
              icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
              label="Flexible dates"
              helper="Check one or two nearby dates for visible savings"
              checked={criteria.flexibleDates}
              onChange={(checked) => updateCriteria({ flexibleDates: checked })}
              compact
            />
          </div>
        </div>
    </div>
  );
}

function TravelersStep({
  criteria,
  updateCriteria
}: {
  criteria: SearchCriteria;
  updateCriteria: (patch: Partial<SearchCriteria>) => void;
}) {
  return (
    <div className="space-y-5">
      <TravelerSelector
        travelers={criteria.travelers}
        onTravelersChange={(travelers) => {
          updateCriteria({
            travelers,
            rooms: roomAffectingTravelerShapeChanged(criteria.travelers, travelers)
              ? buildRoomsForTravelers(travelers)
              : criteria.rooms
          });
        }}
      />

      <RoomAllocator
        rooms={criteria.rooms}
        travelers={criteria.travelers}
        onRoomsChange={(rooms) => updateCriteria({ rooms })}
      />
    </div>
  );
}

const BUDGET_BOUNDS: Record<Currency, { max: number; step: number }> = {
  PLN: { max: 20000, step: 100 },
  EUR: { max: 5000, step: 50 }
};

function PreferencesStep({
  criteria,
  updateCriteria,
  updateBudgetRange,
  updateCurrency,
  toggleTransportMode,
  togglePreference
}: {
  criteria: SearchCriteria;
  updateCriteria: (patch: Partial<SearchCriteria>) => void;
  updateBudgetRange: (min: number, max: number) => void;
  updateCurrency: (currency: Currency) => void;
  toggleTransportMode: (mode: TransportMode) => void;
  togglePreference: (preference: PreferenceKey) => void;
}) {
  const bounds = BUDGET_BOUNDS[criteria.currency] ?? BUDGET_BOUNDS.PLN;
  const budgetMinAmount = criteria.budgetMin?.amount ?? 0;
  const budgetMaxAmount = criteria.budget?.amount ?? bounds.max;

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border-2 border-accent/20 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <WalletCards className="h-4 w-4 text-accent" aria-hidden="true" />
            Budget range
            <Tooltip text="Set a comfortable range. Options near the top of your range are still shown, but the lower end is called out as strong value." />
          </div>
          <div className="flex h-9 rounded-xl border border-line bg-[#fbf7ef] p-1">
            {CURRENCIES.map((currency) => (
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 text-xs font-bold transition",
                  criteria.currency === currency ? "bg-ink text-white shadow-sm" : "text-ink/65 hover:bg-white"
                )}
                aria-pressed={criteria.currency === currency}
                onClick={() => updateCurrency(currency)}
                key={currency}
              >
                {currency}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-3 text-2xl font-bold text-ink sm:text-3xl">
          <span>{formatMoney({ amount: budgetMinAmount, currency: criteria.currency })}</span>
          <span className="text-base font-semibold text-ink/35">to</span>
          <span>{formatMoney({ amount: budgetMaxAmount, currency: criteria.currency })}</span>
        </div>

        <div className="mt-5 px-1">
          <RangeSlider
            min={0}
            max={bounds.max}
            step={bounds.step}
            valueMin={budgetMinAmount}
            valueMax={budgetMaxAmount}
            onChangeMin={(value) => updateBudgetRange(value, budgetMaxAmount)}
            onChangeMax={(value) => updateBudgetRange(budgetMinAmount, value)}
            minLabel="Minimum budget"
            maxLabel="Maximum budget"
          />
        </div>
        <div className="mt-2 flex justify-between px-1 text-xs font-semibold text-ink/45">
          <span>{formatMoney({ amount: 0, currency: criteria.currency })}</span>
          <span>{formatMoney({ amount: bounds.max, currency: criteria.currency })}+</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-line bg-white p-4 shadow-soft">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
            <Plane className="h-4 w-4 text-accent" aria-hidden="true" />
            Preferred transport
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TRANSPORT_OPTIONS.map((option) => {
              const isSelected = criteria.selectedTransportModes.includes(option.value);

              return (
                <button
                  type="button"
                  className={cn(
                    "flex min-h-16 items-center gap-3 rounded-2xl border px-3 py-2 text-left transition",
                    isSelected
                      ? "border-ink bg-ink text-white shadow-soft"
                      : "border-line bg-[#fbf7ef] text-ink hover:border-accent/50 hover:bg-white"
                  )}
                  aria-pressed={isSelected}
                  onClick={() => toggleTransportMode(option.value)}
                  key={option.value}
                >
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", isSelected ? "bg-white/14" : "bg-white")}>
                    {transportIcons[option.value]}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{option.label}</span>
                    <span className={cn("block text-xs", isSelected ? "text-white/68" : "text-ink/55")}>{option.helper}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[24px] border border-line bg-white p-4 shadow-soft">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
            <Hotel className="h-4 w-4 text-accent" aria-hidden="true" />
            Accommodation standard
          </div>
          <div className="space-y-2">
            {ACCOMMODATION_OPTIONS.map((option) => {
              const isSelected = criteria.accommodationStandard === option.value;
              const starCount = option.value.endsWith("-star") ? Number(option.value.split("-")[0]) : 0;

              return (
                <button
                  type="button"
                  key={option.value}
                  aria-pressed={isSelected}
                  onClick={() => updateCriteria({ accommodationStandard: option.value })}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition",
                    isSelected
                      ? "border-ink bg-ink text-white shadow-soft"
                      : "border-line bg-[#fbf7ef] text-ink hover:border-accent/50 hover:bg-white"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    {starCount > 0 ? (
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: starCount }).map((_, index) => (
                          <Star
                            key={index}
                            className={cn("h-3.5 w-3.5", isSelected ? "fill-white text-white" : "fill-accent text-accent")}
                            aria-hidden="true"
                          />
                        ))}
                      </span>
                    ) : (
                      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", isSelected ? "bg-white/14" : "bg-white")}>
                        {option.value === "apartment" ? (
                          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </span>
                    )}
                    <span className="text-sm font-bold">{option.label}</span>
                  </span>
                  {isSelected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SwitchTile
          icon={<Luggage className="h-4 w-4" aria-hidden="true" />}
          label="Checked luggage"
          helper="Include bags in total estimates"
          checked={criteria.checkedLuggage}
          onChange={(checked) => updateCriteria({ checkedLuggage: checked })}
        />
        <SwitchTile
          icon={<PackageCheck className="h-4 w-4" aria-hidden="true" />}
          label="Package holidays"
          helper="Compare tour-operator bundles"
          checked={criteria.packageHolidaysEnabled}
          onChange={(checked) => updateCriteria({ packageHolidaysEnabled: checked })}
        />
      </div>

      <section className="rounded-[24px] border border-line bg-white p-4 shadow-soft">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
          <Settings2 className="h-4 w-4 text-accent" aria-hidden="true" />
          Optimization priorities
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PREFERENCE_OPTIONS.map((option) => {
            const isSelected = criteria.preferences.includes(option.value);

            return (
              <label
                className={cn(
                  "flex cursor-pointer gap-3 rounded-2xl border px-3 py-3 transition",
                  isSelected ? "border-sage/40 bg-sage/10 shadow-sm" : "border-line bg-[#fbf7ef] hover:bg-white"
                )}
                key={option.value}
              >
                <input
                  className="mt-1 h-4 w-4 accent-accent"
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => togglePreference(option.value)}
                />
                <span>
                  <span className="block text-sm font-bold text-ink">{option.label}</span>
                  <span className="block text-xs leading-5 text-ink/55">{option.helper}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ReviewStep({ criteria, errors }: { criteria: SearchCriteria; errors: string[] }) {
  const rooms = criteria.rooms.length;

  return (
    <div className="rounded-[26px] border border-line bg-white p-5 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accentDark">Search summary</p>
      <h3 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
        {criteria.origin} to {criteria.destination || "Anywhere"}
      </h3>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ReviewTile label="Dates" value={`${criteria.departureDate} to ${criteria.returnDate}`} />
        <ReviewTile label="Travelers" value={summarizeTravelers(criteria.travelers)} />
        <ReviewTile label="Rooms" value={`${rooms} room${rooms === 1 ? "" : "s"} configured`} />
        <ReviewTile label="Budget" value={criteria.budget ? formatMoney(criteria.budget) : "No cap"} />
        <ReviewTile label="Transport" value={criteria.selectedTransportModes.join(", ")} />
        <ReviewTile label="Packages" value={criteria.packageHolidaysEnabled ? "Included" : "Skipped"} />
      </div>
      {errors.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-accent/25 bg-accent/5 p-3 text-sm text-accentDark">
          {errors.length} detail{errors.length === 1 ? "" : "s"} need attention before searching.
        </div>
      ) : null}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  icon,
  type = "text",
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: ReactNode;
  type?: "text" | "date";
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-ink">
      <span className="mb-2 flex items-center gap-2">
        <span className="text-accent">{icon}</span>
        {label}
      </span>
      <input
        className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-ink shadow-sm transition placeholder:text-ink/35 focus:border-accent focus:bg-white focus:outline-none"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function SwitchTile({
  icon,
  label,
  helper,
  checked,
  onChange,
  compact = false
}: {
  icon: ReactNode;
  label: string;
  helper: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      className={cn(
        "flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded-2xl border text-left shadow-soft transition hover:shadow-lift",
        compact ? "h-12 px-3" : "min-h-16 px-4 py-3",
        checked ? "border-sage/40 bg-white" : "border-line bg-white hover:border-accent/50"
      )}
      onClick={() => onChange(!checked)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-xl transition-colors",
            compact ? "h-7 w-7" : "h-10 w-10 rounded-2xl",
            checked ? "bg-sage text-white" : "bg-[#fbf7ef] text-accent"
          )}
        >
          {icon}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="block truncate text-sm font-bold text-ink">{label}</span>
          <Tooltip text={helper} />
        </span>
      </span>
      <SwitchTrack checked={checked} />
    </div>
  );
}

function SwitchTrack({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn("flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition", checked ? "bg-accent" : "bg-line")}
    >
      <span className={cn("h-4 w-4 rounded-full bg-white shadow-sm transition", checked ? "translate-x-5" : "translate-x-0")} />
    </span>
  );
}

function ReviewTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-[#fbf7ef] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/65">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
