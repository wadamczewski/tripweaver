"use client";

import {
  ArrowRight,
  Banknote,
  BedDouble,
  CheckCircle2,
  Clock,
  ExternalLink,
  Hotel,
  Leaf,
  Luggage,
  MapPin,
  Package,
  Route,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import type { ComponentType } from "react";

import { convertMoney, formatMoney, formatNumber, subtractMoney } from "@/lib/currency";
import { summarizeTravelers } from "@/lib/defaults";
import type { Currency, Money, PriceBreakdown, SearchCriteria, TripOption } from "@/lib/types";
import { compactTime, formatDuration, modeLabel } from "@/lib/uiText";

export type TripSummaryRailProps = {
  selectedTrip?: TripOption | null;
  featuredTrip?: TripOption | null;
  comparedTrips?: TripOption[];
  criteria?: SearchCriteria | null;
  currency?: Currency;
  isSaved?: boolean;
  savedTrips?: TripOption[];
  onSaveTrip?: (trip: TripOption) => void;
  onRemoveSavedTrip?: (tripId: string) => void;
  onRemoveSaved?: (tripId: string) => void;
  onViewDetails?: (tripId: string) => void;
  className?: string;
};

type SummaryMetric = {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
};

export function TripSummaryRail({
  selectedTrip: selectedTripProp,
  featuredTrip,
  comparedTrips = [],
  criteria,
  currency,
  isSaved = false,
  savedTrips = [],
  onSaveTrip,
  onRemoveSavedTrip,
  onRemoveSaved,
  onViewDetails,
  className = ""
}: TripSummaryRailProps) {
  const selectedTrip = selectedTripProp ?? featuredTrip ?? null;
  const activeCurrency = currency ?? selectedTrip?.totalPrice.currency ?? criteria?.currency ?? "PLN";
  const removeSavedHandler = onRemoveSavedTrip ?? onRemoveSaved;

  if (!selectedTrip) {
    return (
      <aside
        className={`rounded-[8px] border border-line bg-paper/95 p-4 shadow-soft lg:sticky lg:top-6 ${className}`}
        aria-label="Trip summary"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-accentDark">
          <Sparkles className="h-4 w-4" />
          Trip summary
        </div>
        <h2 className="mt-3 text-xl font-semibold text-ink">Select an option</h2>
        <p className="mt-2 text-sm leading-6 text-ink/62">
          The rail will show price, route, room fit, luggage, cancellation, and carbon context.
        </p>
      </aside>
    );
  }

  const tripTotal = convertMoney(selectedTrip.totalPrice, activeCurrency);
  const budget = criteria?.budget ? convertMoney(criteria.budget, activeCurrency) : null;
  const budgetDelta = budget ? subtractMoney(budget, tripTotal) : null;
  const metrics = buildSummaryMetrics(selectedTrip, activeCurrency);
  const providerLinks = buildProviderLinks(selectedTrip);
  const comparedRows = comparedTrips.filter((trip) => trip.id !== selectedTrip.id).slice(0, 3);
  const tripIsSaved = isSaved || savedTrips.some((trip) => trip.id === selectedTrip.id);
  const travelerSummary = selectedTrip.travelerGroup
    ? summarizeTravelers(selectedTrip.travelerGroup)
    : criteria?.travelers
      ? summarizeTravelers(criteria.travelers)
      : "Travelers pending";

  return (
    <aside
      className={`space-y-4 rounded-[8px] border border-line bg-paper/95 p-4 shadow-soft lg:sticky lg:top-6 ${className}`}
      aria-label="Trip summary"
    >
      <div className="border-b border-line pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-accentDark">
              {selectedTrip.kind === "package" ? <Package className="h-4 w-4" /> : <Route className="h-4 w-4" />}
              {selectedTrip.kind === "package" ? "Package holiday" : "Self-organized trip"}
            </div>
            <h2 className="mt-2 text-xl font-semibold leading-tight text-ink">{selectedTrip.label}</h2>
          </div>
          <div className="rounded-[8px] bg-ink px-3 py-2 text-center text-white">
            <div className="text-xl font-semibold leading-none">{Math.round(selectedTrip.score)}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-white/72">score</div>
          </div>
        </div>

        <div className="mt-4 rounded-[8px] bg-white p-3">
          <div className="text-sm text-ink/58">Estimated total</div>
          <div className="mt-1 text-3xl font-semibold tracking-normal text-ink">{formatMoney(tripTotal)}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-mist px-2.5 py-1 text-ink/66">
              {formatMoney(convertMoney(selectedTrip.pricePerPerson, activeCurrency))} per person
            </span>
            {budgetDelta ? (
              <span
                className={`rounded-full px-2.5 py-1 ${
                  budgetDelta.amount >= 0 ? "bg-sage text-white" : "bg-accent text-white"
                }`}
              >
                {budgetDelta.amount >= 0
                  ? `${formatMoney(budgetDelta)} under budget`
                  : `${formatMoney(convertMoney({ amount: Math.abs(budgetDelta.amount), currency: activeCurrency }, activeCurrency))} over budget`}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div key={metric.label} className="rounded-[8px] border border-line bg-white p-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-mist text-accentDark">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/46">{metric.label}</div>
                  <div className="mt-1 font-semibold text-ink">{metric.value}</div>
                  <p className="mt-1 text-sm leading-5 text-ink/58">{metric.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[8px] border border-line bg-white p-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-accentDark" />
          <h3 className="font-semibold text-ink">Party and rooms</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-ink/66">{travelerSummary}</p>
        <div className="mt-3 space-y-2">
          {selectedTrip.roomAllocation.map((room, index) => (
            <div key={room.roomId} className="rounded-[8px] bg-mist px-3 py-2 text-sm text-ink/70">
              Room {index + 1}: {room.adults} adult{room.adults === 1 ? "" : "s"}
              {room.childAges.length > 0 ? ` / children ${room.childAges.join(", ")}` : ""}
              {room.infantAges.length > 0 ? ` / infants ${room.infantAges.join(", ")}` : ""}
            </div>
          ))}
        </div>
      </div>

      <PriceBreakdownList breakdown={selectedTrip.priceBreakdown} currency={activeCurrency} />

      {comparedRows.length > 0 ? (
        <div className="rounded-[8px] border border-line bg-white p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accentDark" />
            <h3 className="font-semibold text-ink">Compared now</h3>
          </div>
          <div className="mt-3 space-y-3">
            {comparedRows.map((trip) => (
              <div key={trip.id} className="border-b border-line pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{trip.label}</div>
                    <p className="mt-1 text-xs leading-5 text-ink/58">
                      {formatDuration(trip.totalDurationMinutes)} / {trip.transfers} transfer
                      {trip.transfers === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-ink">
                    {formatMoney(convertMoney(trip.totalPrice, activeCurrency))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-[8px] border border-line bg-white p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-sage" />
          <h3 className="font-semibold text-ink">Booking context</h3>
        </div>
        <div className="mt-3 space-y-3 text-sm leading-6 text-ink/66">
          <p>{selectedTrip.accommodation.cancellationPolicy}</p>
          <p>
            {selectedTrip.transportOption?.luggageIncluded || selectedTrip.packageHoliday?.luggageIncluded
              ? "Checked luggage is included in the current estimate."
              : "Checked luggage is priced separately in the current estimate."}
          </p>
          {selectedTrip.packageHoliday?.ageNotes?.slice(0, 2).map((note) => <p key={note}>{note}</p>)}
          {selectedTrip.transportOption?.providerNotes?.slice(0, 2).map((note) => <p key={note}>{note}</p>)}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {onViewDetails ? (
          <button
            type="button"
            onClick={() => onViewDetails(selectedTrip.id)}
            className="flex items-center justify-center gap-2 rounded-[8px] bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accentDark"
          >
            View trip details
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}

        {(tripIsSaved && removeSavedHandler) || (!tripIsSaved && onSaveTrip) ? (
          <button
            type="button"
            onClick={() => {
              if (tripIsSaved) {
                removeSavedHandler?.(selectedTrip.id);
              } else {
                onSaveTrip?.(selectedTrip);
              }
            }}
            className="flex items-center justify-center gap-2 rounded-[8px] border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accentDark"
          >
            <CheckCircle2 className="h-4 w-4" />
            {tripIsSaved ? "Saved" : "Save trip"}
          </button>
        ) : null}

        {providerLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-[8px] border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accentDark"
          >
            {link.label}
            <ExternalLink className="h-4 w-4" />
          </a>
        ))}
      </div>
    </aside>
  );
}

function buildSummaryMetrics(trip: TripOption, currency: Currency): SummaryMetric[] {
  const firstSegment = trip.transportSegments[0];
  const lastSegment = trip.transportSegments[trip.transportSegments.length - 1];
  const routeLabel = firstSegment && lastSegment ? `${firstSegment.origin} to ${lastSegment.destination}` : "Route pending";
  const departure = firstSegment ? compactTime(firstSegment.departureTime) : "TBD";
  const arrival = lastSegment ? compactTime(lastSegment.arrivalTime) : "TBD";
  const primaryMode = trip.transportSegments[0]?.mode;
  const transportLabel = primaryMode ? modeLabel(primaryMode) : trip.kind === "package" ? "Package flight" : "Transport";

  return [
    {
      label: "Route",
      value: routeLabel,
      detail: `${transportLabel} / ${departure} to ${arrival}`,
      icon: MapPin
    },
    {
      label: "Travel time",
      value: formatDuration(trip.totalDurationMinutes),
      detail: `${trip.transfers} transfer${trip.transfers === 1 ? "" : "s"} door to door`,
      icon: Clock
    },
    {
      label: "Stay",
      value: trip.accommodation.name,
      detail: `${trip.accommodation.rating.toFixed(1)} rating / ${trip.accommodation.roomType} / ${trip.accommodation.boardType}`,
      icon: Hotel
    },
    {
      label: "Carbon",
      value: `${formatNumber(trip.carbonKg)} kg CO2`,
      detail: "Estimated trip footprint",
      icon: Leaf
    },
    {
      label: "Local costs",
      value: formatMoney(convertMoney(trip.priceBreakdown.localTransport, currency)),
      detail: "Estimated local transport after arrival",
      icon: Banknote
    },
    {
      label: "Bags",
      value: trip.transportOption?.luggageIncluded || trip.packageHoliday?.luggageIncluded ? "Included" : "Add-on",
      detail: trip.packageHoliday?.airportTransferIncluded ? "Airport transfer included" : "Airport transfer priced separately",
      icon: Luggage
    }
  ];
}

function PriceBreakdownList({ breakdown, currency }: { breakdown: PriceBreakdown; currency: Currency }) {
  const rows: Array<{ label: string; value: Money; icon: ComponentType<{ className?: string }> }> = [
    { label: "Transport", value: breakdown.transport, icon: Route },
    { label: "Accommodation", value: breakdown.accommodation, icon: BedDouble },
    { label: "Luggage", value: breakdown.luggage, icon: Luggage },
    { label: "Transfers", value: breakdown.transfers, icon: MapPin },
    { label: "Food", value: breakdown.food, icon: Package },
    { label: "Insurance", value: breakdown.insurance, icon: ShieldCheck }
  ];

  return (
    <div className="rounded-[8px] border border-line bg-white p-4">
      <div className="flex items-center gap-2">
        <Banknote className="h-4 w-4 text-accentDark" />
        <h3 className="font-semibold text-ink">Cost breakdown</h3>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map((row) => {
          const Icon = row.icon;
          const value = convertMoney(row.value, currency);

          if (value.amount === 0) {
            return null;
          }

          return (
            <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-ink/64">
                <Icon className="h-3.5 w-3.5 text-ink/36" />
                {row.label}
              </span>
              <span className="font-semibold text-ink">{formatMoney(value)}</span>
            </div>
          );
        })}
        <div className="border-t border-line pt-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-ink">Total</span>
            <span className="font-semibold text-ink">{formatMoney(convertMoney(breakdown.total, currency))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildProviderLinks(trip: TripOption): Array<{ label: string; href: string }> {
  const links: Array<{ label: string; href: string }> = [];

  if (trip.packageHoliday?.bookingUrl) {
    links.push({ label: "Open package", href: trip.packageHoliday.bookingUrl });
  }

  if (trip.transportOption?.bookingUrl) {
    links.push({ label: "Open transport", href: trip.transportOption.bookingUrl });
  }

  if (trip.accommodation.bookingUrl) {
    links.push({ label: "Open stay", href: trip.accommodation.bookingUrl });
  }

  trip.transportSegments.forEach((segment) => {
    if (segment.bookingUrl && !links.some((link) => link.href === segment.bookingUrl)) {
      links.push({ label: `Open ${segment.provider}`, href: segment.bookingUrl });
    }
  });

  return links.slice(0, 3);
}
