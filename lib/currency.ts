import type { Currency, Money } from "@/lib/types";

const EUR_TO_PLN = 4.35;

export function money(amount: number, currency: Currency): Money {
  return {
    amount: Math.round(amount),
    currency
  };
}

export function convertMoney(value: Money, currency: Currency): Money {
  if (value.currency === currency) {
    return money(value.amount, currency);
  }

  if (value.currency === "PLN" && currency === "EUR") {
    return money(value.amount / EUR_TO_PLN, currency);
  }

  return money(value.amount * EUR_TO_PLN, currency);
}

export function moneyFromPln(amount: number, currency: Currency): Money {
  return convertMoney({ amount, currency: "PLN" }, currency);
}

export function addMoney(values: Money[], currency: Currency): Money {
  return money(
    values.reduce((total, item) => total + convertMoney(item, currency).amount, 0),
    currency
  );
}

export function subtractMoney(left: Money, right: Money): Money {
  return money(left.amount - convertMoney(right, left.currency).amount, left.currency);
}

export function formatMoney(value: Money): string {
  return new Intl.NumberFormat(value.currency === "PLN" ? "pl-PL" : "de-DE", {
    style: "currency",
    currency: value.currency,
    maximumFractionDigits: 0
  }).format(value.amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 0
  }).format(value);
}
