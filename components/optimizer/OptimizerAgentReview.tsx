"use client";

import { RefreshCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
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
  const [review, setReview] = useState(initialReview);
  const [reviewedWeights, setReviewedWeights] = useState(() => stableJson(initialReview.appliedWeights));
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState<string | undefined>();
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
    <section className={styles.review} aria-live="polite">
      <div className={styles.copy}>
        <div className={styles.topline}>
          <div className={styles.eyebrow}>
            <Sparkles size={18} aria-hidden="true" />
            Trip Optimizer agent
          </div>
          <div className={styles.status} data-state={isReviewing ? "working" : hasChanges ? "pending" : "complete"}>
            <span className={styles.statusDot} aria-hidden="true" />
            {statusLabel}
          </div>
        </div>
        <h3>{review.headline}</h3>
        <p>{review.summary}</p>
        <p className={styles.statusBody}>{statusBody}</p>
        {error ? <p className={styles.error}>{error}</p> : null}
      </div>

      {hasChanges ? (
        <button className={styles.button} type="button" onClick={requestReview} disabled={isReviewing}>
          <RefreshCcw size={20} aria-hidden="true" />
          {isReviewing ? "Reviewing..." : "Review updated ranking"}
        </button>
      ) : null}
    </section>
  );
}
