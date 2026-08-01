"use client";

import { ChevronDown, RefreshCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import styles from "./OptimizerAgentReview.module.css";
import type {
  AccommodationOffer,
  OptimizerAgentReview,
  OptimizerWeights,
  TransportOffer,
  TripOption,
  TripSearchCriteria,
} from "../../lib/trip/types";

type Props = {
  criteria: TripSearchCriteria;
  transportOptions: TransportOffer[];
  accommodationOptions: AccommodationOffer[];
  tripOptions: TripOption[];
  weights: OptimizerWeights;
  initialReview: OptimizerAgentReview;
  onReview?: (review: OptimizerAgentReview) => void;
};

function stableJson(value: unknown) {
  return JSON.stringify(value);
}

export function OptimizerAgentReview({
  criteria,
  transportOptions,
  accommodationOptions,
  tripOptions,
  weights,
  initialReview,
  onReview,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [review, setReview] = useState(initialReview);
  const [reviewedWeights, setReviewedWeights] = useState(() => stableJson(initialReview.appliedWeights));
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // A new search produces a brand-new initialReview (different generatedAt)
  // without remounting this component — resync local state so a second
  // search doesn't keep showing the first search's stale headline/summary.
  useEffect(() => {
    setReview(initialReview);
    setReviewedWeights(stableJson(initialReview.appliedWeights));
  }, [initialReview]);

  const currentWeights = useMemo(() => stableJson(weights), [weights]);
  const hasChanges = currentWeights !== reviewedWeights;
  const statusLabel = isReviewing ? "Agent working" : hasChanges ? "Changes pending" : "Agent complete";
  const statusBody = isReviewing
    ? "Reviewing the current results with updated optimizer settings."
    : hasChanges
      ? "Optimizer settings changed. Rerun the agent for a fresh ranking."
      : "Spawned after search and ranked the current result set.";

  async function requestReview() {
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
  }

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
          {!expanded ? <span className={styles.inlineHeadline}>{review.headline}</span> : null}
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
          <h3>{review.headline}</h3>
          <p>{review.summary}</p>
          <p className={styles.statusBody}>{statusBody}</p>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
