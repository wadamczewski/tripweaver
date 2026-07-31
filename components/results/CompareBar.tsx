"use client";

import clsx from "clsx";
import { Scale, Trash2, X } from "lucide-react";
import type { TripOption } from "@/lib/types";
import { DEFAULT_ESTIMATE_LABEL, formatDuration, formatMoney } from "./helpers";

type CompareBarProps = {
  selectedOptions: TripOption[];
  maxOptions?: number;
  estimateLabel?: string;
  className?: string;
  onRemove?: (option: TripOption) => void;
  onClear?: () => void;
  onCompare?: (options: TripOption[]) => void;
};

export function CompareBar({
  selectedOptions,
  maxOptions = 3,
  estimateLabel = DEFAULT_ESTIMATE_LABEL,
  className,
  onRemove,
  onClear,
  onCompare
}: CompareBarProps) {
  if (selectedOptions.length === 0) {
    return null;
  }

  return (
    <section
      className={clsx(
        "sticky bottom-4 z-20 rounded-lg border border-ink/10 bg-ink p-3 text-white shadow-lift",
        className
      )}
      aria-label="Trip comparison"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Scale className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              Compare {selectedOptions.length}/{maxOptions} trip option{selectedOptions.length === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-white/60">{estimateLabel} side-by-side view</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto lg:justify-center">
          {selectedOptions.map((option) => (
            <div
              key={option.id}
              className="flex min-w-[13rem] items-center justify-between gap-3 rounded-md bg-white/10 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{option.label}</p>
                <p className="mt-0.5 text-xs text-white/60">
                  {formatMoney(option.totalPrice)} | {formatDuration(option.totalDurationMinutes)} | {option.score}/100
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/75 transition hover:bg-white/20 hover:text-white"
                aria-label={`Remove ${option.label} from comparison`}
                onClick={() => onRemove?.(option)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/20 hover:text-white"
            onClick={onClear}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Clear
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accentDark"
            onClick={() => onCompare?.(selectedOptions)}
          >
            Compare selected
          </button>
        </div>
      </div>
    </section>
  );
}

