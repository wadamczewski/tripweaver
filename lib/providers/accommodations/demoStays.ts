import type { AccommodationOffer, TravelProvider, TripSearchCriteria } from "../../trip/types";
import { daysBetween, money } from "../http";

const PLN_PER_UNIT: Record<string, number> = {
  PLN: 1,
  EUR: 1 / 4.35,
  USD: 1 / 3.95,
};

function fromPln(amountPln: number, currency: string) {
  const rate = PLN_PER_UNIT[currency] ?? 1;
  return amountPln * rate;
}

type DemoStay = {
  suffix: string;
  name: string;
  stars: number;
  rating: number;
  reviewCount: number;
  roomName: string;
  nightlyPln: number;
  cancellationPolicy: string;
};

const DEMO_STAYS: DemoStay[] = [
  {
    suffix: "central",
    name: "Aparthotel Central",
    stars: 3,
    rating: 8.4,
    reviewCount: 1240,
    roomName: "Family apartment, 2 bedrooms",
    nightlyPln: 480,
    cancellationPolicy: "Free cancellation up to 3 days before check-in",
  },
  {
    suffix: "boutique",
    name: "Boutique Hotel del Mar",
    stars: 4,
    rating: 9.0,
    reviewCount: 860,
    roomName: "Deluxe family room",
    nightlyPln: 720,
    cancellationPolicy: "Free cancellation up to 7 days before check-in",
  },
  {
    suffix: "suites",
    name: "Family Suites Poblenou",
    stars: 4,
    rating: 8.7,
    reviewCount: 540,
    roomName: "Two-room suite, sofa bed",
    nightlyPln: 610,
    cancellationPolicy: "Free cancellation up to 5 days before check-in",
  },
  {
    suffix: "budget",
    name: "Budget Inn Downtown",
    stars: 2,
    rating: 7.6,
    reviewCount: 2100,
    roomName: "Double room with extra bed",
    nightlyPln: 320,
    cancellationPolicy: "Non-refundable",
  },
  {
    suffix: "resort",
    name: "Coastal Family Resort",
    stars: 5,
    rating: 9.2,
    reviewCount: 410,
    roomName: "Family bungalow, half board",
    nightlyPln: 980,
    cancellationPolicy: "Free cancellation up to 14 days before check-in",
  },
];

export const demoStaysProvider: TravelProvider<AccommodationOffer> = {
  id: "tripweaver-demo-stays",
  name: "TripWeaver Demo Stays",
  kind: "accommodation",
  async search(criteria: TripSearchCriteria) {
    const nights = daysBetween(criteria.departureDate, criteria.returnDate);
    const travelerCount = criteria.travelers.adults + criteria.travelers.children + (criteria.travelers.infants ?? 0);
    const groupFactor = 1 + Math.max(0, travelerCount - 2) * 0.08;

    return DEMO_STAYS.map((stay) => {
      const totalPln = stay.nightlyPln * nights * groupFactor;

      return {
        id: `demo-stay-${stay.suffix}`,
        providerId: "tripweaver-demo-stays",
        providerName: "TripWeaver Demo Stays",
        providerOfferId: stay.suffix,
        name: `${stay.name} — ${criteria.destination}`,
        location: criteria.destination,
        stars: stay.stars,
        rating: stay.rating,
        reviewCount: stay.reviewCount,
        roomName: stay.roomName,
        nights,
        totalPrice: money(fromPln(totalPln, criteria.currency), criteria.currency),
        cancellationPolicy: stay.cancellationPolicy,
      } satisfies AccommodationOffer;
    });
  },
};
