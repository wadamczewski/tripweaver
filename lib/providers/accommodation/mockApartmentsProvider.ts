import { moneyFromPln } from "@/lib/currency";
import { nightsBetween, providerDelay, providerUrls } from "@/lib/providers/providerUtils";
import type { AccommodationOption, AccommodationProvider, SearchCriteria } from "@/lib/types";

export const mockApartmentsProvider: AccommodationProvider = {
  id: "mock-apartments",
  name: "Mock Apartments Adapter",
  async search(criteria) {
    await providerDelay(320);
    const nights = nightsBetween(criteria);

    return [
      {
        id: "apt-gracia",
        provider: "Airbnb-style demo",
        name: "Gracia Market Apartment",
        location: "Gracia, Barcelona",
        rating: 4.6,
        reviewCount: 304,
        nights,
        roomType: "Two-bedroom apartment",
        roomAllocation: criteria.rooms,
        boardType: "Kitchen · self catering",
        totalPrice: moneyFromPln(criteria.flexibleDates ? 3380 : 3930, criteria.currency),
        taxesIncluded: true,
        cancellationPolicy: "Moderate cancellation policy",
        childPolicy: "Children and teenagers are accepted at the same occupancy count.",
        occupancyExplanation: "A two-bedroom apartment keeps the family in one unit and avoids a second hotel room.",
        bookingUrl: providerUrls.booking,
        available: true,
        imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "apt-poblenou",
        provider: "Vrbo-style demo",
        name: "Poblenou Terrace Flat",
        location: "Poblenou",
        rating: 4.2,
        reviewCount: 178,
        nights,
        roomType: "One bedroom + sofa bed",
        roomAllocation: criteria.rooms,
        boardType: "Kitchen · self catering",
        totalPrice: moneyFromPln(3140, criteria.currency),
        taxesIncluded: true,
        cancellationPolicy: "Strict demo policy",
        childPolicy: "Guests aged 14+ count toward adult occupancy.",
        occupancyExplanation: "Lowest apartment price, but one shared sleeping area reduces comfort.",
        bookingUrl: providerUrls.booking,
        available: true,
        imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "apt-sagrada-premium",
        provider: "Expedia apartments demo",
        name: "Sagrada Familia Residence",
        location: "Sagrada Familia",
        rating: 4.8,
        reviewCount: 428,
        nights,
        roomType: "Premium two-bedroom apartment",
        roomAllocation: criteria.rooms,
        boardType: "Kitchen · welcome breakfast",
        totalPrice: moneyFromPln(4560, criteria.currency),
        taxesIncluded: true,
        cancellationPolicy: "Free cancellation until 5 days before arrival",
        childPolicy: "No child supplement.",
        occupancyExplanation: "Best apartment quality with enough beds for adjacent-room preference.",
        bookingUrl: providerUrls.booking,
        available: true,
        imageUrl: "https://images.unsplash.com/photo-1560184897-ae75f418493e?auto=format&fit=crop&w=1200&q=80"
      }
    ];
  }
};
