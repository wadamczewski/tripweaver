import { addMoney, moneyFromPln } from "@/lib/currency";
import type {
  Currency,
  ProviderTravelerCategory,
  ProviderTravelerMapping,
  SearchCriteria,
  Traveler,
  TravelerPrice
} from "@/lib/types";

export type ProviderKind = "airline" | "rail" | "bus" | "hotel" | "package";

type PricingRule = {
  adultBasePln: number;
  childFactor: number;
  youthFactor: number;
  infantNoSeatFeePln: number;
  infantSeatFactor: number;
  seniorFactor?: number;
  taxRate: number;
  feePln: number;
  currency: Currency;
};

export function mapTravelersForProvider(criteria: SearchCriteria, provider: ProviderKind): ProviderTravelerMapping[] {
  return criteria.travelers.travelers.map((traveler) => ({
    travelerId: traveler.id,
    category: categoryForTraveler(traveler, provider),
    pricingAge: traveler.ageAtDeparture
  }));
}

export function buildTravelerPrices(
  criteria: SearchCriteria,
  provider: ProviderKind,
  rule: PricingRule
): TravelerPrice[] {
  return criteria.travelers.travelers.map((traveler) => {
    const category = categoryForTraveler(traveler, provider);
    const multiplier = multiplierForCategory(category, rule);
    const rawBase =
      category === "INFANT_NO_SEAT" ? rule.infantNoSeatFeePln : Math.round(rule.adultBasePln * multiplier);
    const taxes = Math.round(rawBase * rule.taxRate);
    const discount = Math.max(0, rule.adultBasePln - rawBase);

    return {
      travelerId: traveler.id,
      travelerLabel: travelerLabel(traveler),
      providerCategory: category,
      basePrice: moneyFromPln(rawBase, rule.currency),
      taxes: moneyFromPln(taxes, rule.currency),
      fees: moneyFromPln(rule.feePln, rule.currency),
      discount: discount > 0 ? moneyFromPln(discount, rule.currency) : undefined,
      note: pricingNote(traveler, provider, category)
    };
  });
}

export function totalTravelerPrice(prices: TravelerPrice[], currency: Currency) {
  return addMoney(
    prices.flatMap((price) => [price.basePrice, price.taxes, price.fees]),
    currency
  );
}

export function travelerLabel(traveler: Traveler): string {
  if (traveler.type === "adult") {
    return traveler.id.replace("-", " ");
  }

  return `${traveler.type} ${traveler.id.split("-")[1]} · age ${traveler.ageAtDeparture}`;
}

export function categoryLabel(category: ProviderTravelerCategory): string {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function categoryForTraveler(traveler: Traveler, provider: ProviderKind): ProviderTravelerCategory {
  if (traveler.type === "senior") {
    return "SENIOR";
  }

  if (traveler.type === "infant") {
    return traveler.requiresSeparateSeat ? "INFANT_WITH_SEAT" : "INFANT_NO_SEAT";
  }

  if (traveler.type === "adult") {
    return "ADULT";
  }

  if (provider === "airline") {
    return traveler.ageAtDeparture >= 12 ? "ADULT" : "CHILD";
  }

  if (provider === "rail") {
    return traveler.ageAtDeparture >= 15 ? "YOUTH" : "CHILD";
  }

  if (provider === "bus") {
    return traveler.ageAtDeparture >= 14 ? "ADULT" : "CHILD";
  }

  if (provider === "hotel") {
    return traveler.ageAtDeparture >= 13 ? "ADULT" : "CHILD";
  }

  return traveler.ageAtDeparture >= 15 ? "YOUTH" : "CHILD";
}

export type CategoryWeights = Record<ProviderTravelerCategory, number>;

export const DEFAULT_CATEGORY_WEIGHTS: CategoryWeights = {
  ADULT: 1,
  SENIOR: 1,
  YOUTH: 0.85,
  CHILD: 0.65,
  INFANT_WITH_SEAT: 0.35,
  INFANT_NO_SEAT: 0.1
};

export function weightForCategory(category: ProviderTravelerCategory, weights: CategoryWeights = DEFAULT_CATEGORY_WEIGHTS) {
  return weights[category] ?? 1;
}

function multiplierForCategory(category: ProviderTravelerCategory, rule: PricingRule): number {
  if (category === "CHILD") {
    return rule.childFactor;
  }

  if (category === "YOUTH") {
    return rule.youthFactor;
  }

  if (category === "INFANT_WITH_SEAT") {
    return rule.infantSeatFactor;
  }

  if (category === "SENIOR") {
    return rule.seniorFactor ?? 1;
  }

  return 1;
}

function pricingNote(traveler: Traveler, provider: ProviderKind, category: ProviderTravelerCategory): string | undefined {
  if (traveler.type === "child" && provider === "airline" && category === "ADULT") {
    return "This airline charges passengers aged 12 and over the adult fare.";
  }

  if (traveler.type === "child" && provider === "hotel" && category === "ADULT") {
    return "The hotel treats the 14-year-old traveler as an adult for occupancy.";
  }

  if (traveler.type === "infant" && category === "INFANT_NO_SEAT") {
    return "The infant fare does not include a separate seat.";
  }

  if (traveler.type === "child" && category === "CHILD") {
    return "Child discount applied from provider-specific age rules.";
  }

  return undefined;
}
