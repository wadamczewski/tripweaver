"use client";

import { ChevronDown, RefreshCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./OptimizerAgentReview.module.css";
import type {
  AccommodationOffer,
  OptimizerAgentReview,
  OptimizerWeights,
  PackageOffer,
  TransportOffer,
  TripOption,
  TripSearchCriteria,
} from "../../lib/trip/types";

type Props = {
  criteria: TripSearchCriteria;
  transportOptions: TransportOffer[];
  accommodationOptions: AccommodationOffer[];
  tripOptions: TripOption[];
  // Arrives later than everything else (packages can take up to ~2
  // minutes) — starts empty. When it transitions to non-empty, this
  // component automatically re-requests a review so packages get a chance
  // to be ranked too, instead of only ever being judged by whichever
  // review happened to fire first.
  packageOptions: PackageOffer[];
  weights: OptimizerWeights;
  // Undefined right after a search — the core search results (transport,
  // accommodation, tripOptions) are already in by then, but the agent
  // review is fetched separately and arrives later. This component fires
  // that request itself on mount rather than the caller blocking on it.
  initialReview?: OptimizerAgentReview;
  onReview?: (review: OptimizerAgentReview) => void;
  // Lets a parent (e.g. a status strip on the Complete Trips tab) show its
  // own "AI ranking in progress" indicator without duplicating this
  // component's internal isReviewing state.
  onReviewingChange?: (isReviewing: boolean) => void;
};

function stableJson(value: unknown) {
  return JSON.stringify(value);
}

export function OptimizerAgentReview({
  criteria,
  transportOptions,
  accommodationOptions,
  tripOptions,
  packageOptions,
  weights,
  initialReview,
  onReview,
  onReviewingChange,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [review, setReview] = useState<OptimizerAgentReview | null>(initialReview ?? null);
  const [reviewedWeights, setReviewedWeights] = useState(() =>
    initialReview ? stableJson(initialReview.appliedWeights) : null,
  );
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    onReviewingChange?.(isReviewing);
  }, [isReviewing, onReviewingChange]);

  // A new search produces a brand-new initialReview (different generatedAt)
  // without remounting this component — resync local state so a second
  // search doesn't keep showing the first search's stale headline/summary.
  useEffect(() => {
    setReview(initialReview ?? null);
    setReviewedWeights(initialReview ? stableJson(initialReview.appliedWeights) : null);
  }, [initialReview]);

  const currentWeights = useMemo(() => stableJson(weights), [weights]);
  const hasChanges = review !== null && currentWeights !== reviewedWeights;
  const statusLabel = isReviewing ? "Agent working" : hasChanges ? "Changes pending" : "Agent complete";
  const statusBody = isReviewing
    ? review
      ? "Reviewing the current results with updated optimizer settings."
      : "Ranking these results — this can take up to a minute."
    : hasChanges
      ? "Optimizer settings changed. Rerun the agent for a fresh ranking."
      : "Spawned after search and ranked the current result set.";

  const requestReview = useCallback(async () => {
    setIsReviewing(true);
    setError(undefined);

    try {
      const response = await fetch("/api/trip-optimizer-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criteria,
          transportOptions,
          accommodationOptions,
          tripOptions,
          packageOptions,
          weights,
          changeReason: "User changed Trip Optimizer settings",
        }),
      });

      if (!response.ok) throw new Error("The optimizer review could not be refreshed.");

      const nextReview = (await response.json()) as OptimizerAgentReview;
      setReview(nextReview);
      setReviewedWeights(stableJson(nextReview.appliedWeights));
      onReview?.(nextReview);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The optimizer review could not be refreshed.");
    } finally {
      setIsReviewing(false);
    }
  }, [criteria, transportOptions, accommodationOptions, tripOptions, packageOptions, weights, onReview]);

  // No review yet for the current options (fresh search, or tripOptions
  // changed under us) — request one automatically instead of waiting for the
  // user to notice and click "Review updated ranking". Guarded by a ref
  // (not state) keyed on the tripOptions reference so React Strict Mode's
  // dev-only double-invoke of this effect doesn't fire two real OpenRouter
  // calls for the same result set — the ref persists across that simulated
  // remount, unlike a fresh closure would.
  const autoRequestedForRef = useRef<TripOption[] | null>(null);
  // Tracks which packageOptions snapshot has already been sent to the
  // agent — set here too (not just by the re-review effect below) so that
  // when packages happen to already be populated by the time this first
  // review fires, the re-review effect recognizes they were already
  // included and doesn't immediately fire a redundant second call.
  const packagesReviewedForRef = useRef<PackageOffer[] | null>(null);

  useEffect(() => {
    if (review || isReviewing || (tripOptions.length === 0 && packageOptions.length === 0)) return;
    if (autoRequestedForRef.current === tripOptions) return;
    autoRequestedForRef.current = tripOptions;
    packagesReviewedForRef.current = packageOptions;
    void requestReview();
  }, [review, isReviewing, tripOptions, packageOptions, requestReview]);

  // Packages usually arrive well after the first review already ran (they
  // can take up to ~2 minutes, the review only ~20-60s) — once they land,
  // automatically re-review so the agent gets a chance to weigh them
  // against the already-ranked self-organized trips, instead of packages
  // being silently excluded from every ranking just because of when they
  // happened to resolve. Same ref-guard reasoning as above.
  useEffect(() => {
    if (packageOptions.length === 0 || isReviewing || !review) return;
    if (packagesReviewedForRef.current === packageOptions) return;
    packagesReviewedForRef.current = packageOptions;
    void requestReview();
  }, [packageOptions, isReviewing, review, requestReview]);

  return (
    <section className={styles.review} aria-live="polite" data-expanded={expanded}>
      <div className={styles.headerRow}>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          <span className={styles.eyebrow}>
            <Sparkles size={18} aria-hidden="true" />
            Trip Optimizer agent
          </span>
          {!expanded ? (
            <span className={styles.inlineHeadline}>{review ? review.headline : "Ranking your results…"}</span>
          ) : null}
          <span className={styles.status} data-state={isReviewing ? "working" : hasChanges ? "pending" : "complete"}>
            <span className={styles.statusDot} aria-hidden="true" />
            {statusLabel}
          </span>
          <ChevronDown size={18} className={styles.chevronIcon} aria-hidden="true" />
        </button>

        {hasChanges ? (
          <button className={styles.button} type="button" onClick={requestReview} disabled={isReviewing}>
            <RefreshCcw size={18} aria-hidden="true" />
            {isReviewing ? "Reviewing..." : "Review updated ranking"}
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className={styles.copy}>
          <h3>{review ? review.headline : "Ranking your results…"}</h3>
          <p>{review ? review.summary : "The agent is reviewing these results — check back shortly."}</p>
          <p className={styles.statusBody}>{statusBody}</p>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
