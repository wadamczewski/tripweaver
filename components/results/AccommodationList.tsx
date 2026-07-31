"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  BedDouble,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  Hotel,
  MapPin,
  ShieldCheck,
  Star,
  UsersRound,
  Utensils
} from "lucide-react";
import type { AccommodationOption } from "@/lib/types";
import {
  DEFAULT_ESTIMATE_LABEL,
  formatMoney,
  getAccommodationProviderAction,
  getRoomSummary
} from "./helpers";
import type { ProviderActionPayload } from "./types";

type AccommodationListProps = {
  options: AccommodationOption[];
  rejectedOptions?: AccommodationOption[];
  savedOptionIds?: string[];
  estimateLabel?: string;
  className?: string;
  onToggleSave?: (option: AccommodationOption) => void;
  onOpenProvider?: (action: ProviderActionPayload) => void;
};

export function AccommodationList({
  options,
  rejectedOptions = [],
  savedOptionIds = [],
  estimateLabel = DEFAULT_ESTIMATE_LABEL,
  className,
  onToggleSave,
  onOpenProvider
}: AccommodationListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const allOptions = [...options, ...rejectedOptions];

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
      {allOptions.map((option) => {
        const expanded = expandedIds.has(option.id);
        const saved = savedOptionIds.includes(option.id);
        const action = getAccommodationProviderAction(option);

        return (
          <article
            key={option.id}
            className={clsx(
              "overflow-hidden rounded-lg border bg-white shadow-soft",
              option.available ? "border-line" : "border-accent/20 opacity-80"
            )}
          >
            <div className="grid gap-0 lg:grid-cols-[13rem_1fr_auto]">
              <div className="relative min-h-[12rem] bg-mist lg:min-h-full">
                <img
                  src={option.imageUrl}
                  alt={option.name}
                  className="h-full max-h-72 min-h-[12rem] w-full object-cover lg:max-h-none"
                />
                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink shadow-sm">
                  {option.provider}
                </div>
              </div>

              <div className="min-w-0 p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink/60">
                    {estimateLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sage/10 px-3 py-1 text-xs font-semibold text-sage">
                    <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    {option.rating} ({option.reviewCount})
                  </span>
                  {!option.available ? (
                    <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accentDark">
                      Not valid for this group
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">{option.name}</h2>
                    <p className="mt-1 flex items-center gap-1 text-sm text-ink/60">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {option.location}
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
                    aria-label={saved ? "Remove saved accommodation" : "Save accommodation"}
                    onClick={() => onToggleSave?.(option)}
                  >
                    <Heart className={clsx("h-4 w-4", saved && "fill-current")} aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StayMetric icon={BedDouble} label="Room" value={option.roomType} />
                  <StayMetric icon={UsersRound} label="Allocation" value={getRoomSummary(option.roomAllocation)} />
                  <StayMetric icon={Utensils} label="Board" value={option.boardType} />
                  <StayMetric icon={ShieldCheck} label="Cancellation" value={option.cancellationPolicy} />
                </div>

                {option.occupancyExplanation || option.childPolicy || option.unavailableReason ? (
                  <p className="mt-4 rounded-md bg-paper p-3 text-sm leading-5 text-ink/65">
                    {option.unavailableReason ?? option.occupancyExplanation ?? option.childPolicy}
                  </p>
                ) : null}
              </div>

              <aside className="flex flex-col justify-between border-t border-line bg-mist p-5 lg:min-w-[13rem] lg:border-l lg:border-t-0 lg:text-right">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">{estimateLabel}</p>
                  <p className="mt-2 text-2xl font-bold text-ink">{formatMoney(option.totalPrice)}</p>
                  <p className="mt-1 text-sm text-ink/60">
                    {option.nights} night{option.nights === 1 ? "" : "s"} | {option.taxesIncluded ? "Taxes incl." : "Taxes est."}
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
              <div className="grid gap-4 border-t border-line bg-paper/70 p-5 xl:grid-cols-[1fr_0.8fr]">
                <div className="rounded-lg border border-line bg-white/80 p-4">
                  <h3 className="text-sm font-semibold text-ink">Room allocation</h3>
                  <div className="mt-3 grid gap-2">
                    {option.roomAllocation.map((room) => (
                      <div key={room.roomId} className="rounded-md bg-paper p-3 text-sm text-ink/70">
                        <span className="font-semibold text-ink">{room.roomId}</span>: {room.adults} adult
                        {room.adults === 1 ? "" : "s"}
                        {room.childAges.length > 0 ? `, child ages ${room.childAges.join(", ")}` : ""}
                        {room.infantAges.length > 0 ? `, infant ages ${room.infantAges.join(", ")}` : ""}
                      </div>
                    ))}
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
                      className="mt-3 inline-flex w-full cursor-not-allowed items-center justify-between rounded-md border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink/40"
                      disabled
                    >
                      Open at provider
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

function StayMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Hotel;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-line bg-paper/70 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/40">
        <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-ink">{value}</p>
    </div>
  );
}

