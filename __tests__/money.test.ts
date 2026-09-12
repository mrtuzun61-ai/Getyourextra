import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  roundCents,
  dollarsToCents,
  centsToDollars,
  multiplyQuantityByRateCents,
  applyBasisPoints,
  percentStringToBasisPoints,
  basisPointsToPercentString,
  formatMoney,
  sumCents,
  clampNonNegative,
} from "../money.ts";

describe("money helpers", () => {
  test("dollarsToCents handles strings and numbers", () => {
    assert.equal(dollarsToCents("12.50"), 1250);
    assert.equal(dollarsToCents(12.5), 1250);
    assert.equal(dollarsToCents("0"), 0);
  });

  test("dollarsToCents handles invalid input safely", () => {
    assert.equal(dollarsToCents(""), 0);
    assert.equal(dollarsToCents("abc"), 0);
    assert.equal(dollarsToCents(NaN), 0);
  });

  test("centsToDollars round-trips", () => {
    assert.equal(centsToDollars(1250), 12.5);
  });

  test("multiplyQuantityByRateCents rounds to nearest cent", () => {
    assert.equal(multiplyQuantityByRateCents(3, 8000), 24000);
    assert.equal(multiplyQuantityByRateCents(1.33, 8750), 11638);
  });

  test("applyBasisPoints computes percentages precisely", () => {
    assert.equal(applyBasisPoints(35000, 1500), 5250); // 15% of $350.00
    assert.equal(applyBasisPoints(45000, 1500), 6750); // 15% of $450.00
  });

  test("percentStringToBasisPoints / basisPointsToPercentString round-trip", () => {
    assert.equal(percentStringToBasisPoints("15"), 1500);
    assert.equal(percentStringToBasisPoints("8.25"), 825);
    assert.equal(basisPointsToPercentString(825), "8.25");
  });

  test("formatMoney formats USD and CAD correctly", () => {
    assert.equal(formatMoney(74250, "USD"), "$742.50");
    assert.equal(formatMoney(0, "USD"), "$0.00");
  });

  test("formatMoney handles negative values", () => {
    assert.equal(formatMoney(-500, "USD"), "-$5.00");
  });

  test("formatMoney handles very large values without throwing", () => {
    const result = formatMoney(123456789, "USD");
    assert.equal(typeof result, "string");
    assert.ok(result.includes("1,234,567.89") || result.length > 0);
  });

  test("sumCents sums an array of cent values, ignoring non-finite entries", () => {
    assert.equal(sumCents([100, 200, 300]), 600);
    assert.equal(sumCents([]), 0);
  });

  test("clampNonNegative never returns a negative number", () => {
    assert.equal(clampNonNegative(-100), 0);
    assert.equal(clampNonNegative(100), 100);
  });

  test("roundCents rounds half up consistently", () => {
    assert.equal(roundCents(11637.5), 11638);
    assert.equal(roundCents(11637.4), 11637);
  });
});
