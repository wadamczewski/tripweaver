"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  BadgePercent,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  Hotel,
  Luggage,
  Plane,
  ShieldCheck,
  Star,
  UsersRound,
  Utensils
} from "lucide-react";
import type { PackageHoliday } from "@/lib/types";
import { packageAsAccommodation } from "@/lib/adapters/results";
import {
  DEFAULT_ESTIMATE_LABEL,
  formatMoney,
  formatTravelerCategory,
  getPackageProviderAction,
  getRoomSummary,
  getTravelerPriceTotal
} from "./helpers";
import { HotelDetailsModal } from "./HotelDetailsModal";
import type { ProviderActionPayload } from "./types";

type PackageHolidayListProps = {
  options: PackageHoliday[];
  savedOptionIds?: string[];
  estimateLabel?: string;
  className?: string;
  onToggleSave?: (option: PackageHoliday) => void;
  onOpenProvider?: (action: ProviderActionPayload) => void;
};

export function PackageHolidayList({
  options,
  savedOptionIds = [],
  estimateLabel = DEFAULT_ESTIMATE_LABEL,
  className,
  onToggleSave,
  onOpenProvider
}: PackageHolidayListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
      {options.map((option) => {
        const expanded = expandedIds.has(option.id);
        const saved = savedOptionIds.includes(option.id);
        const action = getPackageProviderAction(option);

        return (
          <article key={option.id} className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
            <div className="grid gap-0 lg:grid-cols-[14rem_1fr_auto]">
              <HotelDetailsModal
                option={packageAsAccommodation(option)}
                className="min-h-[12rem] overflow-hidden bg-mist lg:min-h-full"
              >
                <img
                  src={option.imageUrl}
                  alt={option.hotelName}
                  className="h-full max-h-72 min-h-[12rem] w-full object-cover lg:max-h-none"
                />
                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink shadow-sm">
                  {option.tourOperator}
                </div>
              </HotelDetailsModal>

              <div className="min-w-0 p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {option.savingBadge ? (
                    <span className="rounded-full bg-sage/10 px-3 py-1 text-xs font-semibold text-sageDark">
                      {option.savingBadge}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink/60">
                    {estimateLabel}
                  </span>
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accentDark">
                    Package holiday
                  </span>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">{option.hotelName}</h2>
                    <p className="mt-1 text-sm text-ink/60">
                      {option.departureAirport} to {option.destination} | {option.provider}
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
                    aria-label={saved ? "Remove saved package" : "Save package"}
                    onClick={() => onToggleSave?.(option)}
                  >
                    <Heart className={clsx("h-4 w-4", saved && "fill-current")} aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <PackageMetric icon={Plane} label="Departure" value={option.departureAirport} />
                  <PackageMetric icon={Hotel} label="Hotel" value={`${option.hotelRating} star rating`} />
                  <PackageMetric icon={Utensils} label="Board" value={option.boardType} />
                  <PackageMetric
                    icon={Luggage}
                    label="Included"
                    value={`${option.luggageIncluded ? "Luggage" : "No luggage"} / ${
                      option.airportTransferIncluded ? "Transfers" : "No transfers"
                    }`}
                  />
                </div>

                {option.ageNotes.length > 0 ? (
                  <div className="mt-4 rounded-md bg-paper p-3">
                    <p className="text-sm font-semibold text-ink">Age-aware pricing notes</p>
                    <ul className="mt-2 space-y-1.5">
                      {option.ageNotes.map((note) => (
                        <li key={note} className="text-sm leading-5 text-ink/70">
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <aside className="flex flex-col justify-between border-t border-line bg-mist p-5 lg:min-w-[13rem] lg:border-l lg:border-t-0 lg:text-right">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/62">{estimateLabel}</p>
                  <p className="mt-2 text-2xl font-bold text-ink">{formatMoney(option.totalPrice)}</p>
                  <p className="mt-1 text-sm text-ink/60">
                    {option.durationNights} nights | child discount {formatMoney(option.childDiscount)}
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-accentDark"
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
                <div className="space-y-4">
                  <div className="rounded-lg border border-line bg-white/80 p-4">
                    <h3 className="text-sm font-semibold text-ink">Package details</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <DetailPill label="Room" value={option.roomType} />
                      <DetailPill label="Allocation" value={getRoomSummary(option.roomAllocation)} />
                      <DetailPill label="Board" value={option.boardType} />
                      <DetailPill label="Cancellation" value={option.cancellationPolicy} />
                    </div>
                  </div>

                  <div className="rounded-lg border border-line bg-white/80 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                      <UsersRound className="h-4 w-4 text-sage" aria-hidden="true" />
                      Traveler pricing
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
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-line bg-white/80 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <BadgePercent className="h-4 w-4 text-sage" aria-hidden="true" />
                      Package inclusions
                    </div>
                    <div className="mt-3 grid gap-2">
                      <Inclusion label="Checked luggage" active={option.luggageIncluded} />
                      <Inclusion label="Airport transfer" active={option.airportTransferIncluded} />
                      <Inclusion label="Child discount" active={option.childDiscount.amount > 0} />
                      <Inclusion label="Cancellation policy" active={Boolean(option.cancellationPolicy)} />
                    </div>
                  </div>

                  <div className="rounded-lg border border-line bg-white/80 p-4">
                    <h3 className="text-sm font-semibold text-ink">Open at provider</h3>
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
    </section>
  );
}

function PackageMetric({
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

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-paper p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function Inclusion({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-paper px-3 py-2 text-sm">
      <span className="font-medium text-ink/70">{label}</span>
      <span className={clsx("font-semibold", active ? "text-sageDark" : "text-ink/35")}>
        {active ? "Included" : "Not included"}
      </span>
    </div>
  );
}

