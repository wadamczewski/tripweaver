"use client";

import { Loader2 } from "lucide-react";
import type { RefObject } from "react";

type InfiniteScrollFooterProps = {
  sentinelRef: RefObject<HTMLDivElement | null>;
  hasMore: boolean;
  visibleCount: number;
  totalCount: number;
  itemLabel: string;
  onShowMore: () => void;
};

/**
 * Sentinel div for IntersectionObserver-driven auto-loading, plus a visible
 * "Show more" button as a fallback for keyboard users and anyone whose
 * browser doesn't fire the observer in time — clicking or scrolling both
 * work.
 */
export function InfiniteScrollFooter({
  sentinelRef,
  hasMore,
  visibleCount,
  totalCount,
  itemLabel,
  onShowMore
}: InfiniteScrollFooterProps) {
  if (!hasMore) {
    return (
      <p className="py-2 text-center text-xs text-ink/45">
        Showing all {totalCount} {itemLabel}
      </p>
    );
  }

  return (
    <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-2">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink/70 transition hover:border-accent/30 hover:text-accentDark"
        onClick={onShowMore}
      >
        <Loader2 className="h-4 w-4" aria-hidden="true" />
        Show more ({visibleCount} of {totalCount})
      </button>
    </div>
  );
}
