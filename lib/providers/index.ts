import { bookingAccommodationProvider } from "./accommodations/booking";
import { skyscannerHotelsProvider } from "./accommodations/skyscanner-hotels";
import { demoStaysProvider } from "./accommodations/demoStays";
import { amadeusFlightsProvider } from "./flights/amadeus";
import { duffelFlightsProvider } from "./flights/duffel";
import { demoFlightsProvider } from "./transport/demoFlights";

// amadeusFlightsProvider, bookingAccommodationProvider, and skyscannerHotelsProvider
// all require partner-gated credentials most individual developers can't get (see
// docs/unmocking.md). duffelFlightsProvider is real but needs the
// 'air.offer_requests.create' permission enabled on its token. The demo* providers
// guarantee every category always has clearly-labeled demo results instead of
// showing nothing while those are being sorted out.
export const transportProviders = [amadeusFlightsProvider, duffelFlightsProvider, demoFlightsProvider];
export const accommodationProviders = [bookingAccommodationProvider, skyscannerHotelsProvider, demoStaysProvider];
export const packageProviders = [];

export const allProviders = [...transportProviders, ...accommodationProviders, ...packageProviders];
