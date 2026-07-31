"use client";

import { BadgePercent, ReceiptText, UsersRound } from "lucide-react";
import clsx from "clsx";
import type { PriceBreakdown } from "@/lib/types";
import {
  DEFAULT_ESTIMATE_LABEL,
  formatMoney,
  formatTravelerCategory,
  getBreakdownRows,
  getTravelerPriceTotal
} from "./helpers";

type CostBreakdownProps = {
  breakdown: PriceBreakdown;
  assumptions?: string[];
  estimateLabel?: string;
  showTravelerPricing?: boolean;
  className?: string;
};

export function CostBreakdown({
  breakdown,
  assumptions = [],
  estimateLabel = DEFAULT_ESTIMATE_LABEL,
  showTravelerPricing = true,
  className
}: CostBreakdownProps) {
  const rows = getBreakdownRows(breakdown);

  return (
    <section className={clsx("rounded-[1rem] border border-line/70 bg-white/82 p-4 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accentDark/70">
            <ReceiptText className="h-4 w-4" aria-hidden="true" />
            Cost breakdown
          </div>
          <h3 className="mt-2 text-lg font-semibold text-ink">{formatMoney(breakdown.total)}</h3>
          <p className="mt-1 text-xs text-ink/55">{estimateLabel} total including required add-ons</p>
        </div>
        <div className="rounded-[0.85rem] border border-line/70 bg-mist/80 px-3 py-2 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/62">Line items</p>
          <p className="text-sm font-semibold text-ink">{rows.length}</p>
        </div>
      </div>

      <div className="mt-4 divide-y divide-line/70 rounded-[0.9rem] border border-line/70 bg-paper/80">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 px-3 py-2.5">
            <span className="text-sm text-ink/65">{row.label}</span>
            <span className="text-sm font-semibold text-ink">{formatMoney(row.value)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 bg-mist/90 px-3 py-3">
          <span className="text-sm font-semibold text-ink">Estimated total</span>
          <span className="text-base font-bold text-ink">{formatMoney(breakdown.total)}</span>
        </div>
      </div>

      {showTravelerPricing && breakdown.travelerPrices.length > 0 ? (
        <div className="mt-5">
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <UsersRound className="h-4 w-4 text-sage" aria-hidden="true" />
            Traveler-specific pricing
          </div>
          <div className="grid gap-2">
            {breakdown.travelerPrices.map((price) => (
              <div
                key={price.travelerId}
                className="grid gap-2 rounded-[0.9rem] border border-line/70 bg-paper/80 px-3 py-3 md:grid-cols-[1.2fr_repeat(4,minmax(5rem,auto))]"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{price.travelerLabel}</p>
                  <p className="text-xs text-ink/55">{formatTravelerCategory(price.providerCategory)}</p>
                  {price.note ? <p className="mt-1 text-xs text-accentDark">{price.note}</p> : null}
                </div>
                <PriceCell label="Base" value={formatMoney(price.basePrice)} />
                <PriceCell label="Taxes" value={formatMoney(price.taxes)} />
                <PriceCell label="Fees" value={formatMoney(price.fees)} />
                <PriceCell
                  label="Discount"
                  value={price.discount ? `-${formatMoney(price.discount)}` : "None"}
                  muted={!price.discount}
                />
                <PriceCell label="Total" value={formatMoney(getTravelerPriceTotal(price))} strong />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {assumptions.length > 0 ? (
        <div className="mt-5 rounded-[0.95rem] border border-sage/15 bg-sage/10 p-3">
          <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <BadgePercent className="h-4 w-4 text-sage" aria-hidden="true" />
            Calculation assumptions
          </div>
          <ul className="space-y-1.5">
            {assumptions.map((assumption) => (
              <li key={assumption} className="text-sm leading-5 text-ink/70">
                {assumption}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function PriceCell({
  label,
  value,
  muted = false,
  strong = false
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">{label}</p>
      <p
        className={clsx(
          "mt-1 whitespace-nowrap text-sm",
          strong ? "font-bold text-ink" : "font-semibold text-ink/75",
          muted && "text-ink/60"
        )}
      >
        {value}
      </p>
    </div>
  );
}
