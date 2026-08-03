"use client";

import clsx from "clsx";
import { ChevronDown, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import styles from "./OptimizerAgentReview.module.css";
import type {
  AccommodationOffer,
  OptimizerAgentReview as OptimizerAgentReviewData,
  OptimizerWeights,
  PackageOffer,
  TransportOffer,
  TripOption,
  TripSearchCriteria,
} from "../../lib/trip/types";
// The rich, already-scored TripOption (image, formatted totals, provider
// links) — distinct from the thin trip/types.ts TripOption used for the
// agent request payload above, hence the alias.
import type { TripOption as RichTripOption } from "../../lib/types";
import { formatMoney, getPrimaryTransportLabel, getTripProviderActions } from "../results/helpers";

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
  // The rich version of whichever trip is currently ranked first — once a
  // review exists this is guaranteed to be the agent's actual pick (see
  // applyAgentRanking in lib/scoring.ts, which pins recommendedTripId to
  // the front). Used to show the recommendation's real image, price, and
  // booking links, not just prose.
  recommendedTrip?: RichTripOption;
  // Undefined right after a search — the core search results (transport,
  // accommodation, tripOptions) are already in by then, but the agent
  // review is fetched separately and arrives later. This component fires
  // that request itself on mount rather than the caller blocking on it.
  initialReview?: OptimizerAgentReviewData;
  onReview?: (review: OptimizerAgentReviewData) => void;
  // Lets a parent (e.g. a status strip on the Complete Trips tab) show its
  // own "AI ranking in progress" indicator without duplicating this
  // component's internal isReviewing state.
  onReviewingChange?: (isReviewing: boolean) => void;
  // Lets a parent render its own "Review updated ranking" trigger
  // elsewhere in the layout (e.g. next to the weight controls) instead of
  // duplicating the hasChanges comparison — this component still owns
  // that state, it just also reports it upward.
  onHasChangesChange?: (hasChanges: boolean) => void;
  className?: string;
};

export type OptimizerAgentReviewHandle = {
  requestReview: () => void;
};

function stableJson(value: unknown) {
  return JSON.stringify(value);
}

export const OptimizerAgentReview = forwardRef<OptimizerAgentReviewHandle, Props>(function OptimizerAgentReviewComponent(
  {
    criteria,
    transportOptions,
    accommodationOptions,
    tripOptions,
    packageOptions,
    weights,
    recommendedTrip,
    initialReview,
    onReview,
    onReviewingChange,
    onHasChangesChange,
    className,
  },
  ref,
) {
  const [expanded, setExpanded] = useState(false);
  const [review, setReview] = useState<OptimizerAgentReviewData | null>(initialReview ?? null);
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

  const providerActions = useMemo(
    () => (recommendedTrip ? getTripProviderActions(recommendedTrip) : []),
    [recommendedTrip],
  );

  const currentWeights = useMemo(() => stableJson(weights), [weights]);
  const hasChanges = review !== null && currentWeights !== reviewedWeights;

  useEffect(() => {
    onHasChangesChange?.(hasChanges);
  }, [hasChanges, onHasChangesChange]);

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

      const nextReview = (await response.json()) as OptimizerAgentReviewData;
      setReview(nextReview);
      setReviewedWeights(stableJson(nextReview.appliedWeights));
      // Surface the recommendation as soon as it's ready instead of
      // leaving it collapsed for the user to notice on their own.
      setExpanded(true);
      onReview?.(nextReview);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The optimizer review could not be refreshed.");
    } finally {
      setIsReviewing(false);
    }
  }, [criteria, transportOptions, accommodationOptions, tripOptions, packageOptions, weights, onReview]);

  useImperativeHandle(ref, () => ({ requestReview: () => void requestReview() }), [requestReview]);

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
    <section className={clsx(styles.review, className)} aria-live="polite" data-expanded={expanded}>
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
      </div>

      {expanded ? (
        <div className={styles.copy}>
          <h3>{review ? review.headline : "Ranking your results…"}</h3>

          <div className="relative mt-4 overflow-hidden rounded-lg border border-line bg-paper/60">
            {isReviewing ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/75 text-center backdrop-blur-sm">
                <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
                <p className="px-4 text-sm font-semibold text-ink">
                  {review
                    ? "Re-ranking with the latest options…"
                    : "Ranking your options — this can take up to a minute…"}
                </p>
              </div>
            ) : null}

            <div className={clsx("p-4", isReviewing && "pointer-events-none select-none blur-sm")}>
              {recommendedTrip ? (
                <div className="flex flex-col gap-4 sm:flex-row">
                  {recommendedTrip.accommodation.imageUrl ? (
                    <img
                      src={recommendedTrip.accommodation.imageUrl}
                      alt={recommendedTrip.accommodation.name}
                      className="h-32 w-full shrink-0 rounded-md object-cover sm:w-40"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{recommendedTrip.label}</p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                      <span className="text-xl font-bold text-ink">{formatMoney(recommendedTrip.totalPrice)}</span>
                      <span className="text-sm text-ink/60">
                        {formatMoney(recommendedTrip.pricePerPerson)} per person
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink/60">
                      <span>{getPrimaryTransportLabel(recommendedTrip)}</span>
                      <span>
                        {recommendedTrip.accommodation.name} ({recommendedTrip.accommodation.rating}★)
                      </span>
                      <span>Score {recommendedTrip.score}/100</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {review ? (
                <>
                  <section className={recommendedTrip ? "mt-4" : undefined}>
                    <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">Why this trip</h4>
                    <p className="mt-1 text-sm leading-6 text-ink/75">{review.summary}</p>
                  </section>

                  {review.tradeoffs.length > 0 ? (
                    <section className="mt-4">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">Trade-offs</h4>
                      <ul className="mt-1 space-y-1">
                        {review.tradeoffs.map((tradeoff) => (
                          <li key={tradeoff} className="flex gap-2 text-sm leading-6 text-ink/75">
                            <span className="text-ink/40" aria-hidden="true">
                              •
                            </span>
                            {tradeoff}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {providerActions.length > 0 ? (
                    <section className="mt-4 flex flex-wrap gap-2">
                      {providerActions.map((action) => (
                        <a
                          key={action.id}
                          href={action.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent/30 hover:text-accentDark"
                        >
                          {action.label}
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      ))}
                    </section>
                  ) : null}
                </>
              ) : (
                <p className={clsx("text-sm text-ink/60", recommendedTrip && "mt-4")}>
                  The agent is reviewing these results — check back shortly.
                </p>
              )}
            </div>
          </div>

          <p className={styles.statusBody}>{statusBody}</p>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
});
