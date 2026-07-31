"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bus,
  CalendarDays,
  Car,
  Check,
  CircleDollarSign,
  Compass,
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
  Train,
  WalletCards
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

import { convertMoney, formatMoney } from "@/lib/currency";
import { DEFAULT_TRANSPORT_MODES, summarizeTravelers } from "@/lib/defaults";
import type { AccommodationStandard, Currency, PreferenceKey, SearchCriteria, TransportMode } from "@/lib/types";
import { validateSearchCriteria } from "@/lib/validation";

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
  demoDataLabel?: string;
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
    description: "Review the trip brief, then run the complete demo comparison."
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
  demoDataLabel = "Demo estimates",
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
      budget: criteria.budget ? convertMoney(criteria.budget, currency) : undefined
    });
  }

  function updateBudget(value: string): void {
    const amount = Number(value);

    updateCriteria({
      budget: value.trim() === "" ? undefined : { amount: Number.isFinite(amount) ? amount : 0, currency: criteria.currency }
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
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold">TripWeaver</p>
              <p className="text-xs text-white/52">{demoDataLabel}</p>
            </div>
          </div>

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

          <div className="mt-7 hidden rounded-3xl border border-white/10 bg-white/8 p-4 md:block">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/46">Trip brief</p>
            <p className="mt-3 text-lg font-semibold leading-snug">
              {criteria.origin} to {criteria.destination || "Anywhere"}
            </p>
            <div className="mt-4 space-y-3 text-sm text-white/64">
              <BriefLine label="Dates" value={`${criteria.departureDate} to ${criteria.returnDate}`} />
              <BriefLine label="Group" value={summarizeTravelers(criteria.travelers)} />
              <BriefLine label="Budget" value={criteria.budget ? formatMoney(criteria.budget) : "No cap"} />
            </div>
          </div>
        </aside>

        <section className="min-w-0 bg-[#fbf7ef]">
          <div className="border-b border-line/80 px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-accentDark">{currentStep.eyebrow}</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{currentStep.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#566273]">{currentStep.description}</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-sage/20 bg-sage/10 px-3 py-2 text-sm font-semibold text-sage">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Estimates update after search
              </div>
            </div>
          </div>

          <div className="min-w-0 p-5 sm:p-7">
            <div className="min-h-[420px]">
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
                  updateBudget={updateBudget}
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
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-bold text-ink transition hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-35"
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
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white shadow-soft transition hover:bg-accentDark disabled:cursor-wait disabled:bg-ink/35"
                disabled={loading}
              >
                {isLastStep ? <Search className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)]">
          <TextField
            label="Departure city"
            icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
            value={criteria.origin}
            onChange={(value) => updateCriteria({ origin: value })}
            placeholder="Szczecin"
          />
          <div className="hidden items-end pb-3 md:flex">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-accent shadow-sm">
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <TextField
            label="Destination"
            icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
            value={criteria.destination}
            onChange={(value) => updateCriteria({ destination: value })}
            placeholder="Barcelona or Anywhere"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
        </div>

        <SwitchTile
          icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
          label="Flexible dates"
          helper="Check one or two nearby dates for visible savings"
          checked={criteria.flexibleDates}
          onChange={(checked) => updateCriteria({ flexibleDates: checked })}
        />
      </div>

      <div className="overflow-hidden rounded-[24px] bg-ink text-white shadow-soft">
        <img
          src="https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=900&q=80"
          alt=""
          className="h-48 w-full object-cover opacity-90"
        />
        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Default story</p>
          <p className="mt-2 text-lg font-semibold">A family trip from Szczecin to Barcelona, with Berlin airport savings.</p>
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

function PreferencesStep({
  criteria,
  updateCriteria,
  updateBudget,
  updateCurrency,
  toggleTransportMode,
  togglePreference
}: {
  criteria: SearchCriteria;
  updateCriteria: (patch: Partial<SearchCriteria>) => void;
  updateBudget: (value: string) => void;
  updateCurrency: (currency: Currency) => void;
  toggleTransportMode: (mode: TransportMode) => void;
  togglePreference: (preference: PreferenceKey) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-[24px] border border-line bg-white p-4 shadow-soft">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
            <Plane className="h-4 w-4 text-accent" aria-hidden="true" />
            Preferred transport
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
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

        <div className="space-y-3">
          <label className="block rounded-[24px] border border-line bg-white p-4 text-sm font-semibold text-ink shadow-soft">
            <span className="mb-2 flex items-center gap-2">
              <WalletCards className="h-4 w-4 text-accent" aria-hidden="true" />
              Maximum total budget
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-line bg-[#fbf7ef] px-3 text-sm text-ink shadow-sm transition placeholder:text-ink/35 focus:border-accent focus:bg-white focus:outline-none"
              inputMode="numeric"
              min={0}
              type="number"
              value={criteria.budget?.amount ?? ""}
              onChange={(event) => updateBudget(event.target.value)}
              placeholder="8000"
            />
          </label>

          <div className="rounded-[24px] border border-line bg-white p-4 shadow-soft">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <CircleDollarSign className="h-4 w-4 text-accent" aria-hidden="true" />
              Currency
            </div>
            <div className="grid h-12 grid-cols-2 rounded-2xl border border-line bg-[#fbf7ef] p-1">
              {CURRENCIES.map((currency) => (
                <button
                  type="button"
                  className={cn(
                    "rounded-xl text-sm font-bold transition",
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
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
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
        <label className="block rounded-[24px] border border-line bg-white p-4 text-sm font-semibold text-ink shadow-soft">
          <span className="mb-2 flex items-center gap-2">
            <Hotel className="h-4 w-4 text-accent" aria-hidden="true" />
            Accommodation standard
          </span>
          <select
            className="h-12 w-full rounded-2xl border border-line bg-[#fbf7ef] px-3 text-sm text-ink shadow-sm transition focus:border-accent focus:bg-white focus:outline-none"
            value={criteria.accommodationStandard}
            onChange={(event) => updateCriteria({ accommodationStandard: event.target.value as AccommodationStandard })}
          >
            {ACCOMMODATION_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="rounded-[26px] border border-line bg-white p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accentDark">Search summary</p>
        <h3 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          {criteria.origin} to {criteria.destination || "Anywhere"}
        </h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ReviewTile label="Dates" value={`${criteria.departureDate} to ${criteria.returnDate}`} />
          <ReviewTile label="Travelers" value={summarizeTravelers(criteria.travelers)} />
          <ReviewTile label="Rooms" value={`${rooms} room${rooms === 1 ? "" : "s"} configured`} />
          <ReviewTile label="Budget" value={criteria.budget ? formatMoney(criteria.budget) : "No cap"} />
          <ReviewTile label="Transport" value={criteria.selectedTransportModes.join(", ")} />
          <ReviewTile label="Packages" value={criteria.packageHolidaysEnabled ? "Included" : "Skipped"} />
        </div>
      </div>

      <div className="rounded-[26px] border border-line bg-ink p-5 text-white shadow-soft">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/46">What happens next</p>
        <div className="mt-4 space-y-4">
          {[
            "Provider adapters price every traveler.",
            "Stay providers check room occupancy and teen rules.",
            "Package offers are normalized against separate booking.",
            "The optimizer ranks cheapest, fastest, package, and best overall."
          ].map((item) => (
            <div key={item} className="flex gap-3 text-sm leading-6 text-white/72">
              <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sage text-white">
                <Check className="h-3 w-3" aria-hidden="true" />
              </span>
              {item}
            </div>
          ))}
        </div>
        {errors.length > 0 ? (
          <div className="mt-5 rounded-2xl bg-white/10 p-3 text-sm text-white/72">
            {errors.length} detail{errors.length === 1 ? "" : "s"} need attention before searching.
          </div>
        ) : null}
      </div>
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
  onChange
}: {
  icon: ReactNode;
  label: string;
  helper: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-20 min-w-0 items-center justify-between gap-3 rounded-[24px] border px-4 py-3 text-left shadow-soft transition",
        checked ? "border-sage/40 bg-white" : "border-line bg-white hover:border-accent/50"
      )}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
            checked ? "bg-sage text-white" : "bg-[#fbf7ef] text-accent"
          )}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-ink">{label}</span>
          <span className="block text-xs leading-5 text-ink/55">{helper}</span>
        </span>
      </span>
      <SwitchTrack checked={checked} />
    </button>
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

function BriefLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/36">{label}</p>
      <p className="mt-1 text-white/82">{value}</p>
    </div>
  );
}

function ReviewTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-[#fbf7ef] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/42">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
