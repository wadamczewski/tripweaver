import { bookingAccommodationProvider } from "./accommodations/booking";
import { skyscannerHotelsProvider } from "./accommodations/skyscanner-hotels";
import { hotelbedsAccommodationProvider } from "./accommodations/hotelbeds";
import { serpapiHotelsProvider } from "./accommodations/serpapi-hotels";
import { demoStaysProvider } from "./accommodations/demoStays";
import { amadeusFlightsProvider } from "./flights/amadeus";
import { duffelFlightsProvider } from "./flights/duffel";
import { demoFlightsProvider } from "./transport/demoFlights";
import { apifyDachPackagesProvider } from "./packages/apify-dach-packages";

// amadeusFlightsProvider, bookingAccommodationProvider, and skyscannerHotelsProvider
// all require partner-gated credentials most individual developers can't get (see
// docs/unmocking.md). duffelFlightsProvider is real and working. hotelbedsAccommodationProvider
// is real but needs HOTELBEDS_API_KEY/HOTELBEDS_SECRET and a per-destination
// hotelbedsDestinationCode hint before it returns anything. serpapiHotelsProvider
// (Google Hotels via SerpApi, needs SERPAPI_KEY) works for any destination —
// no per-city code needed — but is comparison-only data (scraped Google Hotels
// results), not a licensed wholesaler feed. The demo* providers guarantee
// every category always has clearly-labeled demo results instead of showing
// nothing while those are being sorted out.
export const transportProviders = [amadeusFlightsProvider, duffelFlightsProvider, demoFlightsProvider];
export const accommodationProviders = [
  bookingAccommodationProvider,
  skyscannerHotelsProvider,
  hotelbedsAccommodationProvider,
  serpapiHotelsProvider,
  demoStaysProvider,
];
// apifyDachPackagesProvider (needs APIFY_API_TOKEN) is a real, live-verified
// source for German package holidays (TUI, DERTOUR, weg.de,
// ab-in-den-urlaub.de, alltours) — but it's an unofficial third-party
// scraper of those operators' own sites, not a licensed feed. See
// PROJECT_STATUS.md's "Where to pick up work" for the ToS caveat and the
// still-open TUI official-API and Duffel Stays follow-ups.
export const packageProviders = [apifyDachPackagesProvider];

export const allProviders = [...transportProviders, ...accommodationProviders, ...packageProviders];
