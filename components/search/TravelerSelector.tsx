"use client";

import { Armchair, Baby, DoorOpen, Minus, Plus, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { Tooltip } from "@/components/ui/Tooltip";
import type { TravelerGroup } from "@/lib/types";

import {
  buildTravelerGroup,
  cn,
  infantSeatFlags,
  resizeChildAges,
  resizeInfantAges,
  resizeInfantSeatFlags,
  travelerAges
} from "./searchUtils";

export type TravelerSelectorProps = {
  travelers: TravelerGroup;
  onTravelersChange: (travelers: TravelerGroup) => void;
  className?: string;
};

const CHILD_AGES = Array.from({ length: 16 }, (_, index) => index + 2);
const INFANT_AGES = [0, 1];

export function TravelerSelector({ travelers, onTravelersChange, className }: TravelerSelectorProps) {
  const childAges = travelerAges(travelers, "child");
  const infantAges = travelerAges(travelers, "infant");
  const infantSeats = infantSeatFlags(travelers);

  function commit(next: {
    adults?: number;
    childAges?: number[];
    infantAges?: number[];
    infantSeats?: boolean[];
    needsAdjacentSeats?: boolean;
    needsAdjacentRooms?: boolean;
  }): void {
    const nextChildAges = next.childAges ?? childAges;
    const nextInfantAges = next.infantAges ?? infantAges;

    onTravelersChange(
      buildTravelerGroup({
        adults: next.adults ?? travelers.adults,
        childAges: nextChildAges,
        infantAges: nextInfantAges,
        infantSeats: resizeInfantSeatFlags(next.infantSeats ?? infantSeats, nextInfantAges.length),
        needsAdjacentSeats: next.needsAdjacentSeats ?? travelers.needsAdjacentSeats,
        needsAdjacentRooms: next.needsAdjacentRooms ?? travelers.needsAdjacentRooms
      })
    );
  }

  function setChildCount(count: number): void {
    commit({
      childAges: resizeChildAges(childAges, count)
    });
  }

  function setInfantCount(count: number): void {
    const nextInfantAges = resizeInfantAges(infantAges, count);

    commit({
      infantAges: nextInfantAges,
      infantSeats: resizeInfantSeatFlags(infantSeats, nextInfantAges.length)
    });
  }

  return (
    <section className={cn("space-y-3 rounded-2xl border border-line bg-white p-4 shadow-soft", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <UsersRound className="h-4 w-4 text-accent" aria-hidden="true" />
          Travelers
          <Tooltip text="Ages are passed through for provider-specific pricing." />
        </div>
        <span className="rounded-md bg-mist px-2.5 py-1 text-xs font-bold text-ink">
          {travelers.totalTravelers} total
        </span>
      </div>

      <div className="grid grid-cols-2 items-start gap-2">
        <div className="overflow-hidden rounded-xl border border-line">
          <StepperRow
            label="Adults"
            value={travelers.adults}
            min={1}
            max={9}
            onChange={(value) => commit({ adults: value })}
          />
        </div>
        <div className="overflow-hidden rounded-xl border border-line">
          <StepperRow label="Children" value={travelers.children} min={0} max={6} onChange={setChildCount} />
        </div>
        <div className="overflow-hidden rounded-xl border border-line">
          <StepperRow label="Infants" value={travelers.infants} min={0} max={4} onChange={setInfantCount} />
        </div>

        {childAges.length > 0 ? (
          <div className="space-y-1.5 rounded-xl border border-line bg-paper/70 px-3 py-2.5">
            <span className="flex items-center gap-1 text-xs font-semibold text-ink/55">
              <UsersRound className="h-3.5 w-3.5 text-sage" aria-hidden="true" />
              Ages
            </span>
            {childAges.map((age, index) => (
              <label
                className="flex items-center justify-between gap-2 text-xs font-semibold text-ink"
                key={`child-age-${index}`}
              >
                <span className="text-ink/50">Child {index + 1}</span>
                <select
                  className="h-8 rounded-lg border border-line bg-white px-2 text-xs font-semibold text-ink shadow-sm transition focus:border-accent focus:outline-none"
                  value={age}
                  onChange={(event) => {
                    const nextAges = [...childAges];
                    nextAges[index] = Number(event.target.value);
                    commit({ childAges: nextAges });
                  }}
                >
                  {CHILD_AGES.map((childAge) => (
                    <option value={childAge} key={childAge}>
                      {childAge}y
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        ) : null}
      </div>

      {infantAges.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-line bg-paper/70 px-3 py-2.5">
          {infantAges.map((age, index) => (
            <div className="flex flex-wrap items-center gap-2" key={`infant-${index}`}>
              <span className="flex items-center gap-1 text-xs font-semibold text-ink/50">
                <Baby className="h-3.5 w-3.5 text-sage" aria-hidden="true" />
                Infant {index + 1}
              </span>
              <select
                className="h-8 rounded-lg border border-line bg-white px-2 text-xs font-semibold text-ink shadow-sm transition focus:border-accent focus:outline-none"
                value={age}
                onChange={(event) => {
                  const nextAges = [...infantAges];
                  nextAges[index] = Number(event.target.value);
                  commit({ infantAges: nextAges });
                }}
              >
                {INFANT_AGES.map((infantAge) => (
                  <option value={infantAge} key={infantAge}>
                    {infantAge === 0 ? "Under 1y" : "1y"}
                  </option>
                ))}
              </select>
              <CompactToggle
                icon={<Armchair className="h-3.5 w-3.5" aria-hidden="true" />}
                label="Separate seat"
                helper="If off, the infant travels on an adult's lap where the provider allows it, usually at a lower fare"
                checked={infantSeats[index] ?? false}
                onChange={(checked) => {
                  const nextSeats = resizeInfantSeatFlags(infantSeats, infantAges.length);
                  nextSeats[index] = checked;
                  commit({ infantSeats: nextSeats });
                }}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SwitchRow
          icon={<Armchair className="h-4 w-4" aria-hidden="true" />}
          label="Adjacent seats"
          helper="Require the group to be seated together on transport where the provider allows it"
          checked={travelers.needsAdjacentSeats}
          onChange={(checked) => commit({ needsAdjacentSeats: checked })}
        />
        <SwitchRow
          icon={<DoorOpen className="h-4 w-4" aria-hidden="true" />}
          label="Adjacent rooms"
          helper="Prefer rooms next to or near each other when more than one room is booked"
          checked={travelers.needsAdjacentRooms}
          onChange={(checked) => commit({ needsAdjacentRooms: checked })}
        />
      </div>
    </section>
  );
}

function StepperRow({
  label,
  value,
  min,
  max,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-white px-3 py-2.5">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-30"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span className="min-w-4 text-center text-sm font-bold text-ink">{value}</span>
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-30"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function CompactToggle({
  icon,
  label,
  helper,
  checked,
  onChange
}: {
  icon: ReactNode;
  label: string;
  helper?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition",
          checked ? "border-accent bg-accent text-white" : "border-line bg-white text-ink/60 hover:border-accent/50"
        )}
      >
        {icon}
        {label}
      </button>
      {helper ? <Tooltip text={helper} /> : null}
    </span>
  );
}

function SwitchRow({
  icon,
  label,
  helper,
  checked,
  onChange,
  className
}: {
  icon: ReactNode;
  label: string;
  helper?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      className={cn(
        "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-white px-3 py-2 text-left transition hover:border-accent/50 hover:shadow-soft",
        checked ? "shadow-soft" : "",
        className
      )}
      onClick={() => onChange(!checked)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
        <span className={cn("text-ink/62", checked ? "text-accent" : "")}>{icon}</span>
        <span className="truncate">{label}</span>
        {helper ? <Tooltip text={helper} /> : null}
      </span>
      <span
        className={cn(
          "flex h-5 w-9 shrink-0 items-center rounded-full p-1 transition",
          checked ? "bg-accent" : "bg-line"
        )}
      >
        <span
          className={cn(
            "h-3.5 w-3.5 rounded-full bg-white shadow-sm transition",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </span>
    </div>
  );
}
