"use client";

import { Armchair, Baby, DoorOpen, Minus, Plus, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

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
    <section className={cn("space-y-5 rounded-[26px] border border-line bg-white p-5 shadow-soft", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <UsersRound className="h-4 w-4 text-accent" aria-hidden="true" />
            Travelers
          </div>
          <p className="mt-1 text-sm text-ink/60">Ages are passed through for provider-specific pricing.</p>
        </div>
        <div className="rounded-md bg-mist px-3 py-1.5 text-sm font-semibold text-ink">
          {travelers.totalTravelers} total
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stepper
          label="Adults"
          value={travelers.adults}
          min={1}
          max={9}
          onChange={(value) => commit({ adults: value })}
        />
        <Stepper label="Children" value={travelers.children} min={0} max={6} onChange={setChildCount} />
        <Stepper label="Infants" value={travelers.infants} min={0} max={4} onChange={setInfantCount} />
      </div>

      {childAges.length > 0 ? (
        <div className="rounded-[22px] border border-line bg-paper/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <UsersRound className="h-4 w-4 text-sage" aria-hidden="true" />
            Child ages at departure
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {childAges.map((age, index) => (
              <label className="text-sm font-medium text-ink" key={`child-age-${index}`}>
                Child {index + 1}
                <select
                  className="mt-2 h-12 w-full rounded-2xl border border-line bg-white px-3 py-2 text-base text-ink shadow-sm transition focus:border-accent focus:outline-none"
                  value={age}
                  onChange={(event) => {
                    const nextAges = [...childAges];
                    nextAges[index] = Number(event.target.value);
                    commit({ childAges: nextAges });
                  }}
                >
                  {CHILD_AGES.map((childAge) => (
                    <option value={childAge} key={childAge}>
                      {childAge} years
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {infantAges.length > 0 ? (
        <div className="rounded-[22px] border border-line bg-paper/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Baby className="h-4 w-4 text-sage" aria-hidden="true" />
            Infant details
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {infantAges.map((age, index) => (
              <div className="rounded-2xl border border-line bg-white p-4" key={`infant-${index}`}>
                <label className="text-sm font-medium text-ink">
                  Infant {index + 1} age
                  <select
                    className="mt-2 h-12 w-full rounded-2xl border border-line bg-paper px-3 py-2 text-base text-ink transition focus:border-accent focus:outline-none"
                    value={age}
                    onChange={(event) => {
                      const nextAges = [...infantAges];
                      nextAges[index] = Number(event.target.value);
                      commit({ infantAges: nextAges });
                    }}
                  >
                    {INFANT_AGES.map((infantAge) => (
                      <option value={infantAge} key={infantAge}>
                        {infantAge === 0 ? "Under 1 year" : "1 year"}
                      </option>
                    ))}
                  </select>
                </label>
                <SwitchRow
                  className="mt-3"
                  icon={<Armchair className="h-4 w-4" aria-hidden="true" />}
                  label="Separate seat"
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
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SwitchRow
          icon={<Armchair className="h-4 w-4" aria-hidden="true" />}
          label="Adjacent seats"
          checked={travelers.needsAdjacentSeats}
          onChange={(checked) => commit({ needsAdjacentSeats: checked })}
        />
        <SwitchRow
          icon={<DoorOpen className="h-4 w-4" aria-hidden="true" />}
          label="Adjacent rooms"
          checked={travelers.needsAdjacentRooms}
          onChange={(checked) => commit({ needsAdjacentRooms: checked })}
        />
      </div>
    </section>
  );
}

function Stepper({
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
    <div className="rounded-[22px] border border-line bg-paper/70 p-4">
      <div className="mb-2 text-sm font-semibold text-ink">{label}</div>
      <div className="flex h-12 items-center justify-between rounded-2xl border border-line bg-white px-1.5">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-xl text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:text-ink/25"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="min-w-8 text-center text-sm font-bold text-ink">{value}</span>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-xl text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:text-ink/25"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function SwitchRow({
  icon,
  label,
  checked,
  onChange,
  className
}: {
  icon: ReactNode;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left transition hover:border-accent/50",
        checked ? "shadow-soft" : "",
        className
      )}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
        <span className={cn("text-ink/45", checked ? "text-accent" : "")}>{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          "flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition",
          checked ? "bg-accent" : "bg-line"
        )}
      >
        <span
          className={cn(
            "h-4 w-4 rounded-full bg-white shadow-sm transition",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </span>
    </button>
  );
}
