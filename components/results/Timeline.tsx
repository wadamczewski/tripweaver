"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bus,
  Car,
  Circle,
  Clock3,
  MapPin,
  Plane,
  Route,
  Ship,
  TrainFront
} from "lucide-react";
import clsx from "clsx";
import type { TimelineItem, TransportMode, TransportSegment } from "@/lib/types";
import {
  DEFAULT_ESTIMATE_LABEL,
  formatClock,
  formatDateTime,
  formatDuration,
  formatMode,
  formatMoney,
  getSegmentRoute
} from "./helpers";

type TimelineProps = {
  items: TimelineItem[];
  segments?: TransportSegment[];
  title?: string;
  estimateLabel?: string;
  className?: string;
};

const modeIcons: Record<TransportMode, LucideIcon> = {
  flight: Plane,
  train: TrainFront,
  bus: Bus,
  car: Car,
  ferry: Ship,
  transfer: Route
};

function getModeIcon(mode?: TransportMode): LucideIcon {
  if (!mode) {
    return Circle;
  }

  return modeIcons[mode] ?? Route;
}

export function Timeline({
  items,
  segments = [],
  title = "Door-to-door timeline",
  estimateLabel = DEFAULT_ESTIMATE_LABEL,
  className
}: TimelineProps) {
  return (
    <section className={clsx("rounded-lg border border-line bg-paper/80 p-4", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="text-xs text-ink/55">{estimateLabel} itinerary timing</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-mist px-3 py-1 text-xs font-medium text-ink/70">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          {items.length} timeline step{items.length === 1 ? "" : "s"}
        </div>
      </div>

      <ol className="space-y-0">
        {items.map((item, index) => {
          const Icon = getModeIcon(item.mode);

          return (
            <li key={`${item.time}-${item.title}-${index}`} className="grid grid-cols-[4.5rem_1.5rem_1fr] gap-3">
              <time className="pt-0.5 text-xs font-semibold text-ink/65">{formatClock(item.time)}</time>
              <div className="flex flex-col items-center">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-accent/20 bg-white text-accent shadow-sm">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                {index < items.length - 1 ? <span className="h-full min-h-8 w-px bg-line" /> : null}
              </div>
              <div className="pb-5">
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                <p className="mt-1 text-sm leading-5 text-ink/65">{item.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {segments.length > 0 ? (
        <div className="mt-2 border-t border-line pt-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
            Transport segments
          </h4>
          <div className="grid gap-3">
            {segments.map((segment) => {
              const Icon = getModeIcon(segment.mode);

              return (
                <div
                  key={segment.id}
                  className="grid gap-3 rounded-md border border-line bg-white/70 p-3 sm:grid-cols-[1fr_auto]"
                >
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-ink">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{getSegmentRoute(segment)}</p>
                        <span className="rounded-full bg-sage/10 px-2 py-0.5 text-[11px] font-semibold text-sage">
                          {formatMode(segment.mode)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink/60">
                        {formatDateTime(segment.departureTime)} to {formatDateTime(segment.arrivalTime)} |{" "}
                        {formatDuration(segment.durationMinutes)} | {segment.provider}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:justify-end">
                    <span className="font-semibold text-ink">{formatMoney(segment.price)}</span>
                    <span className="rounded-full bg-mist px-2 py-1 text-ink/60">
                      {segment.luggageIncluded ? "Luggage incl." : "Luggage extra"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-ink/55">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {segment.transfers} transfer{segment.transfers === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

