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

Use `/api/trip-search` for the main search — it calls only the transport and accommodation providers server-side (fast, no packages, no agent review), so the results page can render immediately. Packages and the agent review are fetched separately and merge in as they resolve (see "Progressive search" in the main README).

Use `/api/trip-packages` for package holidays — billed per search (Apify), can take up to ~2 minutes, called once right after `/api/trip-search` returns.

Use `/api/trip-optimizer-review` for the Trip Optimizer agent. `OptimizerAgentReview` fires it automatically on mount when there's no review yet (right after a search), and again whenever the user changes optimizer settings and clicks the refresh button that appears once `hasChanges` is true.

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
