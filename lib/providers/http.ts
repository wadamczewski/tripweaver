import type { CurrencyCode, Money } from "../trip/types";

export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigError";
  }
}

export function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new ProviderConfigError(`Missing ${name}`);
  return value;
}

export function optionalEnv(name: string, fallback: string) {
  return process.env[name] || fallback;
}

export function money(amount: number | string | undefined, currency: CurrencyCode): Money {
  const parsed = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  return {
    amount: Number.isFinite(parsed) ? Number((parsed ?? 0).toFixed(2)) : 0,
    currency,
  };
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 500)}`);
  }

  return text ? (JSON.parse(text) as T) : ({} as T);
}

export function daysBetween(startIso: string, endIso: string) {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(days, 1);
}

export function compactText(values: Array<string | undefined | null>) {
  return values.filter(Boolean).join(" · ");
}
