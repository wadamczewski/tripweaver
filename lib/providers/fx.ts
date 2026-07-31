import type { CurrencyCode, Money } from "../trip/types";

// Static, approximate PLN-per-unit rates used only to make offers priced in
// different currencies (e.g. a EUR-priced Duffel flight vs. a PLN-priced demo
// hotel) comparable and combinable. Not live rates — good enough for ranking
// and budget comparison, not for checkout. An offer's own totalPrice.currency
// still reflects what the provider actually quoted; this is a derived
// conversion applied on top, same spirit as the app's other "Demo estimate"
// derived fields.
const PLN_PER_UNIT: Record<string, number> = {
  PLN: 1,
  EUR: 4.25,
  USD: 3.9,
  GBP: 5,
};

export function convertMoney(money: Money, targetCurrency: CurrencyCode): Money {
  if (money.currency === targetCurrency) return money;

  const fromRate = PLN_PER_UNIT[money.currency] ?? 1;
  const toRate = PLN_PER_UNIT[targetCurrency] ?? 1;
  const amountInPln = money.amount * fromRate;

  return {
    amount: Number((amountInPln / toRate).toFixed(2)),
    currency: targetCurrency,
  };
}
