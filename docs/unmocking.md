# TripWeaver Unmocking Notes

The app now has a server-side provider shape that mirrors the mocked search layer:

```ts
provider.search(criteria)
```

The first production adapters are:

- Flights: Amadeus and Duffel
- Accommodation: Booking.com Demand API and Skyscanner Hotels

Wire them into the restored app by replacing the mocked arrays in `lib/search.ts` with:

```ts
import { transportProviders, accommodationProviders, packageProviders } from "./providers";
```

Use `/api/trip-search` for the main search. It calls the providers server-side and then asks the Trip Optimizer agent to review the combined results through OpenRouter.

Use `/api/trip-optimizer-review` when Trip Optimizer settings change. The included `OptimizerAgentReview` component only shows its refresh button after the user has changed optimizer settings, so multiple slider/toggle changes can be made before the agent is re-run.

## OpenRouter

TripWeaver's backend agent reads OpenRouter credentials from the app runtime environment:

```sh
OPENROUTER_API_KEY=...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_NAME=TripWeaver
```

Codex's own `~/.codex/config.toml` provider settings are separate. They control which model Codex uses while editing the project; they do not automatically configure the TripWeaver app server.

All third-party credentials belong in environment variables. Do not call Amadeus, Duffel, Booking.com, Skyscanner, or OpenRouter from client components.
