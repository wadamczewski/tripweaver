import type {
  AccommodationOffer,
  OptimizerAgentReview,
  OptimizerWeights,
  TransportOffer,
  TripOption,
  TripSearchCriteria,
} from "../trip/types";

type ReviewInput = {
  criteria: TripSearchCriteria;
  transportOptions: TransportOffer[];
  accommodationOptions: AccommodationOffer[];
  tripOptions: TripOption[];
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

function heuristicReview(input: ReviewInput): OptimizerAgentReview {
  const cheapest = Math.min(...input.tripOptions.map((option) => option.totalPrice.amount).filter(Boolean));
  const fastest = Math.min(
    ...input.tripOptions.map((option) => option.transport.durationMinutes ?? Number.POSITIVE_INFINITY),
  );
  const ranked = [...input.tripOptions]
    .map((option) => ({
      ...option,
      score: fallbackScore(option, cheapest, fastest, input.weights),
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const winner = ranked[0];

  return {
    recommendedTripId: winner?.id,
    headline: winner
      ? `Best current match: ${winner.transport.providerName} + ${winner.accommodation.providerName}`
      : "No trips ranked yet",
    summary: winner
      ? "The fallback optimizer ranked the available results with the current Trip Optimizer settings. Add OPENAI_API_KEY to enable the agent review."
      : "No provider returned enough results to review.",
    rankedTripIds: ranked.map((option) => option.id),
    warnings: input.tripOptions.length === 0 ? ["No combined trip options were available."] : [],
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
  return [
    {
      role: "system",
      content:
        "You are TripWeaver's trip optimization agent.\n\nYour job is to rank real travel search results for a family trip. Use only the provided options. Do not invent prices, routes, hotels, amenities, policies, or availability.\n\nApply the Trip Optimizer weights exactly:\n- price: lower total trip price is better\n- speed: shorter transport duration and fewer stops are better\n- comfort: better accommodation quality, ratings, and room fit are better\n- luggage: included checked luggage is better when requested\n- familyFit: age-aware pricing, suitable room allocation, and lower friction for children are better\n\nExplain the tradeoff behind the recommendation in plain language. If results are incomplete, currencies do not match, providers failed, or important family constraints are missing, include warnings.\n\nReturn only valid JSON matching the provided schema.",
    },
    {
      role: "user",
      content: JSON.stringify({
        task: "Choose and rank the best trip options.",
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

  if (!process.env.OPENROUTER_API_KEY || input.tripOptions.length === 0) {
    console.log("[optimizer-agent] heuristic fallback (no OPENROUTER_API_KEY or no trip options)");
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
      `[optimizer-agent] ${model} ranked ${input.tripOptions.length} trips, recommended ${parsed.recommendedTripId ?? "none"}: "${parsed.headline ?? "no headline"}"`,
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
