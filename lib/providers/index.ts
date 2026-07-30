import { bookingAccommodationProvider } from "./accommodations/booking";
import { skyscannerHotelsProvider } from "./accommodations/skyscanner-hotels";
import { amadeusFlightsProvider } from "./flights/amadeus";
import { duffelFlightsProvider } from "./flights/duffel";

export const transportProviders = [amadeusFlightsProvider, duffelFlightsProvider];
export const accommodationProviders = [bookingAccommodationProvider, skyscannerHotelsProvider];
export const packageProviders = [];

export const allProviders = [...transportProviders, ...accommodationProviders, ...packageProviders];
