import { convertMoney } from "../providers/fx";
import type {
  AccommodationOffer,
  OptimizerAgentReview,
  OptimizerWeights,
  PackageOffer,
  TransportOffer,
  TripOption,
  TripSearchCriteria,
} from "../trip/types";

type ReviewInput = {
  criteria: TripSearchCriteria;
  transportOptions: TransportOffer[];
  accommodationOptions: AccommodationOffer[];
  tripOptions: TripOption[];
  // Bundled tour-operator deals — a genuine alternative to a self-organized
  // tripOption, not a separate category the agent should ignore. Optional
  // so the "Tune the recommendation" re-review call (which predates
  // packages) still works without passing them.
  packageOptions?: PackageOffer[];
  weights: OptimizerWeights;
  changeReason?: string;
};

const defaultWeights: OptimizerWeights = {
  price: 0.35,
  speed: 0.2,
  comfort: 0.2,
  luggage: 0.1,
  familyFit: 0.15,
};

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function fallbackScore(option: TripOption, cheapest: number, fastest: number, weights: OptimizerWeights) {
  const priceScore = cheapest > 0 ? clamp(cheapest / option.totalPrice.amount) : 0.5;
  const speedScore =
    option.transport.durationMinutes && fastest > 0 ? clamp(fastest / option.transport.durationMinutes) : 0.55;
  const comfortScore = clamp(((option.accommodation.rating ?? option.accommodation.stars ?? 3) - 1) / 4);
  const luggageScore = option.transport.luggageIncluded ? 1 : 0.45;
  const familyScore = option.accommodation.roomName || option.accommodation.cancellationPolicy ? 0.85 : 0.6;

  return (
    priceScore * weights.price +
    speedScore * weights.speed +
    comfortScore * weights.comfort +
    luggageScore * weights.luggage +
    familyScore * weights.familyFit
  );
}

function fallbackScorePackage(offer: PackageOffer, priceInCurrency: number, cheapest: number, weights: OptimizerWeights) {
  const priceScore = cheapest > 0 ? clamp(cheapest / priceInCurrency) : 0.5;
  // Flight duration isn't part of the package actor's data — neutral
  // default rather than a fabricated number.
  const speedScore = 0.55;
  const comfortScore = clamp(((offer.hotelRating ?? 3) - 1) / 4);
  const luggageScore = offer.luggageIncluded ? 1 : 0.45;
  const familyScore = offer.airportTransferIncluded ? 0.85 : 0.6;

  return (
    priceScore * weights.price +
    speedScore * weights.speed +
    comfortScore * weights.comfort +
    luggageScore * weights.luggage +
    familyScore * weights.familyFit
  );
}

// Shared by heuristicReview (the actual ranking when there's no API key)
// and reviewPrompt (as a grounding hint for the real LLM call) — both need
// the same cheapest/fastest baselines and currency-converted package
// prices, and computing them twice risked the two paths drifting apart.
function computeRankingContext(input: ReviewInput) {
  const packageOptions = input.packageOptions ?? [];
  // Package prices come from a EUR-priced source regardless of the search
  // currency — normalize before comparing against PLN (or whatever the
  // search uses) trip totals, same reasoning as the rich-UI currency fix.
  const packagePricesInCurrency = packageOptions.map(
    (offer) => convertMoney(offer.totalPrice, input.criteria.currency).amount,
  );

  const allPrices = [...input.tripOptions.map((option) => option.totalPrice.amount), ...packagePricesInCurrency].filter(
    Boolean,
  );
  const cheapest = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const fastest = Math.min(
    ...input.tripOptions.map((option) => option.transport.durationMinutes ?? Number.POSITIVE_INFINITY),
  );

  return { packageOptions, packagePricesInCurrency, cheapest, fastest };
}

function heuristicReview(input: ReviewInput): OptimizerAgentReview {
  const { packageOptions, packagePricesInCurrency, cheapest, fastest } = computeRankingContext(input);

  const rankedTrips = input.tripOptions.map((option) => ({
    id: option.id,
    label: `${option.transport.providerName} + ${option.accommodation.providerName}`,
    score: fallbackScore(option, cheapest, fastest, input.weights),
  }));
  const rankedPackages = packageOptions.map((offer, index) => ({
    id: offer.id,
    label: `${offer.tourOperator} package — ${offer.hotelName}`,
    score: fallbackScorePackage(offer, packagePricesInCurrency[index], cheapest, input.weights),
  }));

  const ranked = [...rankedTrips, ...rankedPackages].sort((a, b) => b.score - a.score);
  const winner = ranked[0];

  return {
    recommendedTripId: winner?.id,
    headline: winner ? `Best current match: ${winner.label}` : "No trips ranked yet",
    summary: winner
      ? "The fallback optimizer ranked the available results with the current Trip Optimizer settings. Add OPENAI_API_KEY to enable the agent review."
      : "No provider returned enough results to review.",
    rankedTripIds: ranked.map((option) => option.id),
    warnings:
      input.tripOptions.length === 0 && packageOptions.length === 0
        ? ["No combined trip options were available."]
        : [],
    appliedWeights: input.weights,
    generatedAt: new Date().toISOString(),
    model: "heuristic-fallback",
  };
}

function extractResponseText(data: any) {
  if (typeof data.output_text === "string") return data.output_text;

  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") return content.text;
    }
  }

  return undefined;
}

function reviewPrompt(input: ReviewInput) {
  // Grounding hint: the same weighted-score formula used for the no-API-key
  // fallback, computed here too and handed to the real model as a
  // `localScore` per option. With 500+ items in one prompt, an LLM given
  // only qualitative field values and a vague "apply these weights"
  // instruction tends to fall back on price as the one number it can
  // compare at a glance, regardless of what the weights actually say —
  // observed live as rankings that looked price-sorted almost every time,
  // even with balanced or price-deprioritized weights. Giving it a
  // concrete 0-1 number that already combines every weighted axis removes
  // most of the room for that shortcut.
  const { packageOptions, packagePricesInCurrency, cheapest, fastest } = computeRankingContext(input);

  return [
    {
      role: "system",
      content:
        "You are TripWeaver's trip optimization agent.\n\nYour job is to rank real travel search results for a family trip. Use only the provided options. Do not invent prices, routes, hotels, amenities, policies, or availability.\n\nTwo kinds of options are provided, and you must rank them together in one list, not as separate categories: tripOptions (self-organized flight + hotel combos) and packageOptions (bundled tour-operator holiday packages, priced as a single total). A package's flight duration and per-line costs aren't broken out — judge it mainly on total price, hotel rating, and whether luggage/transfers are included.\n\nEach option includes a localScore (0-1): price, speed, comfort, luggage, and familyFit already combined per the given weights, using the SAME formula for every option. Use it as your primary ranking signal — sort by it first, then reorder only where a field it can't see (a real warning, a policy detail, an especially poor family fit) genuinely changes the call. Do not silently revert to ranking by price alone; if price ends up dominating your final order, it should be because the weights say price matters most, not because it was the easiest number to compare across hundreds of options.\n\nApply the Trip Optimizer weights exactly, same definitions localScore already used:\n- price: lower total trip price is better\n- speed: shorter transport duration and fewer stops are better (packages have no known duration — treat as average)\n- comfort: better accommodation quality, ratings, and room fit are better\n- luggage: included checked luggage is better when requested\n- familyFit: age-aware pricing, suitable room allocation, and lower friction for children are better (an included airport transfer counts in favor of a package here)\n\nExplain the tradeoff behind the recommendation in plain language. If results are incomplete, currencies do not match, providers failed, or important family constraints are missing, include warnings.\n\nReturn only valid JSON matching the provided schema. rankedTripIds must be a single list mixing tripOptions ids and packageOptions ids, ordered best first.",
    },
    {
      role: "user",
      content: JSON.stringify({
        task: "Choose and rank the best trip options, including package holidays, as one combined list.",
        outputSchema: {
          recommendedTripId: "string",
          headline: "string",
          summary: "string",
          rankedTripIds: ["string"],
          warnings: ["string"],
        },
        changeReason: input.changeReason,
        criteria: input.criteria,
        weights: input.weights,
        tripOptions: input.tripOptions.map((option) => ({
          id: option.id,
          totalPrice: option.totalPrice,
          localScore: Number(fallbackScore(option, cheapest, fastest, input.weights).toFixed(3)),
          transport: {
            provider: option.transport.providerName,
            title: option.transport.title,
            durationMinutes: option.transport.durationMinutes,
            stops: option.transport.stops,
            luggageIncluded: option.transport.luggageIncluded,
            operatingCarriers: option.transport.operatingCarriers,
          },
          accommodation: {
            provider: option.accommodation.providerName,
            name: option.accommodation.name,
            stars: option.accommodation.stars,
            rating: option.accommodation.rating,
            roomName: option.accommodation.roomName,
          },
        })),
        packageOptions: packageOptions.map((offer, index) => ({
          id: offer.id,
          tourOperator: offer.tourOperator,
          hotelName: offer.hotelName,
          hotelRating: offer.hotelRating,
          boardType: offer.boardType,
          nights: offer.nights,
          // Converted to the search currency — the source actor prices
          // packages in EUR regardless of what currency the search uses.
          totalPrice: convertMoney(offer.totalPrice, input.criteria.currency),
          localScore: Number(
            fallbackScorePackage(offer, packagePricesInCurrency[index], cheapest, input.weights).toFixed(3),
          ),
          luggageIncluded: offer.luggageIncluded,
          airportTransferIncluded: offer.airportTransferIncluded,
        })),
      }),
    },
  ];
}

function optimizerReviewSchema() {
  return {
    name: "trip_optimizer_review",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        recommendedTripId: { type: "string" },
        headline: { type: "string" },
        summary: { type: "string" },
        rankedTripIds: { type: "array", items: { type: "string" } },
        warnings: { type: "array", items: { type: "string" } },
      },
      required: ["recommendedTripId", "headline", "summary", "rankedTripIds", "warnings"],
    },
  };
}

function parseOpenRouterContent(content: unknown) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return undefined;

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") return part.text;
      return "";
    })
    .join("");
}

export async function reviewTripOptionsWithAgent(input: ReviewInput): Promise<OptimizerAgentReview> {
  const weights = input.weights ?? defaultWeights;
  const payload = { ...input, weights };

  const packageCount = input.packageOptions?.length ?? 0;

  if (!process.env.OPENROUTER_API_KEY || (input.tripOptions.length === 0 && packageCount === 0)) {
    console.log("[optimizer-agent] heuristic fallback (no OPENROUTER_API_KEY or no options to rank)");
    return heuristicReview(payload);
  }

  try {
    const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
    const baseUrl = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        ...(process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {}),
        ...(process.env.OPENROUTER_APP_NAME ? { "X-OpenRouter-Title": process.env.OPENROUTER_APP_NAME } : {}),
      },
      body: JSON.stringify({
        model,
        messages: reviewPrompt(payload),
        // No fixed `temperature` here on purpose: reasoning-tier models
        // (e.g. openai/gpt-5-mini, o-series) reject a custom temperature
        // entirely, and combined with `require_parameters: true` below
        // that turns into a hard 404 with no fallback route — verified
        // live switching models. The strict JSON schema already
        // constrains the output shape regardless of temperature.
        provider: {
          require_parameters: true,
        },
        response_format: {
          type: "json_schema",
          json_schema: optimizerReviewSchema(),
        },
      }),
    });

    if (!response.ok) {
      console.log(`[optimizer-agent] OpenRouter request failed (${response.status}), falling back to heuristic`);
      return heuristicReview(payload);
    }

    const data = await response.json();
    const text = parseOpenRouterContent(data.choices?.[0]?.message?.content) ?? extractResponseText(data);
    const parsed = text ? JSON.parse(text) : {};

    console.log(
      `[optimizer-agent] ${model} ranked ${input.tripOptions.length} trips + ${packageCount} packages, recommended ${parsed.recommendedTripId ?? "none"}: "${parsed.headline ?? "no headline"}"`,
    );

    return {
      recommendedTripId: parsed.recommendedTripId,
      headline: parsed.headline ?? "Trip options reviewed",
      summary: parsed.summary ?? "The optimizer agent reviewed the available trip options.",
      rankedTripIds: Array.isArray(parsed.rankedTripIds) ? parsed.rankedTripIds : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      appliedWeights: weights,
      generatedAt: new Date().toISOString(),
      model,
    };
  } catch {
    return heuristicReview(payload);
  }
}

export { defaultWeights };
