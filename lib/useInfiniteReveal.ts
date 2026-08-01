"use client";

import { useEffect, useRef, useState } from "react";

const REVEAL_ROOT_MARGIN = "600px";

/**
 * Progressively reveals a large already-fetched, already-ordered array
 * instead of rendering all of it at once. No extra network calls — the
 * full list (agent-ranked or otherwise) is already in memory; this just
 * paginates the DOM. Resets back to the first page whenever the array
 * identity changes (new search, re-ranking, re-sorting).
 */
export function useInfiniteReveal<T>(items: T[], pageSize: number) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((current) => Math.min(current + pageSize, items.length));
        }
      },
      { rootMargin: REVEAL_ROOT_MARGIN }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, pageSize]);

  const hasMore = visibleCount < items.length;

  return {
    visibleItems: items.slice(0, visibleCount),
    sentinelRef,
    hasMore,
    showMore: () => setVisibleCount((current) => Math.min(current + pageSize, items.length))
  };
}
