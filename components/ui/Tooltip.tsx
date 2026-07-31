"use client";

import { HelpCircle } from "lucide-react";
import { useId, useState } from "react";

export type TooltipProps = {
  text: string;
  inverted?: boolean;
  className?: string;
};

/**
 * A "?" affordance that reveals field/label descriptions on hover or focus,
 * keeping the visible label short while descriptions stay reachable (and
 * screen-reader accessible via aria-describedby) instead of always-on
 * small print.
 */
export function Tooltip({ text, inverted = false, className = "" }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className={`group/tooltip relative inline-flex shrink-0 ${className}`}>
      <button
        type="button"
        aria-describedby={id}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={`grid h-[1.05em] w-[1.05em] place-items-center rounded-full border text-[0.68em] font-bold leading-none transition ${
          inverted
            ? "border-white/30 bg-white/12 text-white hover:bg-white/20"
            : "border-accent/30 bg-accent/10 text-accentDark hover:bg-accent/20"
        }`}
      >
        <HelpCircle className="h-[0.85em] w-[0.85em]" aria-hidden="true" />
        <span className="sr-only">More information</span>
      </button>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-[calc(100%+0.4rem)] z-30 w-56 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-xs font-medium leading-5 text-white shadow-lift transition-all duration-150 ${
          open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
