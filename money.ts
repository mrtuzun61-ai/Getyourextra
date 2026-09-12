/**
 * Money is ALWAYS represented as an integer number of minor units (cents).
 * Never do money math in floating point dollars. This module is the single
 * source of truth for rounding behavior.
 *
 * NOTE: this file intentionally uses only relative imports (no "@/" alias)
 * so it can be executed directly by `node --experimental-strip-types` for
 * fast, dependency-free unit testing, in addition to running inside the
 * bundled Expo app.
 */
import type { Currency } from "../types/index.ts";

export function roundCents(value: number): number {
  return Math.round(value + Number.EPSILON);
}

export function dollarsToCents(dollars: number | string): number {
  const n = typeof dollars === "string" ? parseFloat(dollars) : dollars;
  if (!Number.isFinite(n)) return 0;
  return roundCents(n * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function multiplyQuantityByRateCents(quantity: number, rateCents: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(rateCents)) return 0;
  return roundCents(quantity * rateCents);
}

export function applyBasisPoints(baseCents: number, basisPoints: number): number {
  if (!Number.isFinite(baseCents) || !Number.isFinite(basisPoints)) return 0;
  return roundCents((baseCents * basisPoints) / 10000);
}

export function percentStringToBasisPoints(percent: number | string): number {
  const n = typeof percent === "string" ? parseFloat(percent) : percent;
  if (!Number.isFinite(n)) return 0;
  return roundCents(n * 100);
}

export function basisPointsToPercentString(basisPoints: number): string {
  return (basisPoints / 100).toFixed(2);
}

const CURRENCY_LOCALE: Record<Currency, string> = {
  USD: "en-US",
  CAD: "en-CA",
};

/** Format integer cents as a currency string, e.g. 74250 -> "$742.50". Safe for very large values. */
export function formatMoney(cents: number, currency: Currency = "USD"): string {
  const safeCents = Number.isFinite(cents) ? cents : 0;
  const dollars = centsToDollars(safeCents);
  const abs = Math.abs(dollars);
  try {
    const formatted = new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(abs);
    return dollars < 0 ? `-${formatted}` : formatted;
  } catch {
    const sign = dollars < 0 ? "-" : "";
    return `${sign}$${abs.toFixed(2)}`;
  }
}

export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => acc + (Number.isFinite(v) ? Math.round(v) : 0), 0);
}

export function clampNonNegative(cents: number): number {
  return Math.max(0, Math.round(Number.isFinite(cents) ? cents : 0));
}
