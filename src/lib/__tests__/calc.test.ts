import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calculateChangeOrderTotals } from "../calc.ts";
import { dollarsToCents, multiplyQuantityByRateCents } from "../money.ts";
import type { LineItem } from "../../types/index.ts";

function li(category: LineItem["category"], qty: number, rateDollars: number, idx = 0): LineItem {
  const unitRateCents = dollarsToCents(rateDollars);
  return {
    id: `li-${idx}`,
    changeOrderId: "co-1",
    category,
    description: "test",
    quantity: qty,
    unitRateCents,
    amountCents: multiplyQuantityByRateCents(qty, unitRateCents),
    sortOrder: idx,
  };
}

describe("calculateChangeOrderTotals", () => {
  test("no markup, no tax", () => {
    const items = [li("labour", 3, 80), li("material", 1, 110)];
    const totals = calculateChangeOrderTotals(
      { markupType: "none", markupValue: 0, taxEnabled: false, taxPercentBasisPoints: 0, discountCents: 0 },
      items
    );
    assert.equal(totals.subtotalCents, dollarsToCents(3 * 80 + 110));
    assert.equal(totals.markupCents, 0);
    assert.equal(totals.taxCents, 0);
    assert.equal(totals.totalCents, totals.subtotalCents);
  });

  test("scenario A: electrician, 15% markup, no tax => $402.50", () => {
    const items = [li("labour", 3, 80), li("material", 1, 110)];
    const totals = calculateChangeOrderTotals(
      { markupType: "percent", markupValue: 1500, taxEnabled: false, taxPercentBasisPoints: 0, discountCents: 0 },
      items
    );
    assert.equal(totals.subtotalCents, 35000);
    assert.equal(totals.markupCents, 5250);
    assert.equal(totals.totalCents, 40250);
  });

  test("fixed markup", () => {
    const items = [li("labour", 2, 50)];
    const totals = calculateChangeOrderTotals(
      { markupType: "fixed", markupValue: dollarsToCents(25), taxEnabled: false, taxPercentBasisPoints: 0, discountCents: 0 },
      items
    );
    assert.equal(totals.subtotalCents, 10000);
    assert.equal(totals.markupCents, 2500);
    assert.equal(totals.totalCents, 12500);
  });

  test("scenario B: HVAC 20% markup, 8.25% tax", () => {
    const labour = li("labour", 4.5, 80);
    const items = [labour, li("material", 1, 185), li("equipment", 1, 40)];
    const totals = calculateChangeOrderTotals(
      { markupType: "percent", markupValue: 2000, taxEnabled: true, taxPercentBasisPoints: 825, discountCents: 0 },
      items
    );
    const expectedSubtotal = labour.amountCents + dollarsToCents(185) + dollarsToCents(40);
    assert.equal(totals.subtotalCents, expectedSubtotal);
    const expectedMarkup = Math.round((expectedSubtotal * 2000) / 10000);
    assert.equal(totals.markupCents, expectedMarkup);
    const base = expectedSubtotal + expectedMarkup;
    const expectedTax = Math.round((base * 825) / 10000);
    assert.equal(totals.taxCents, expectedTax);
    assert.equal(totals.totalCents, base + expectedTax);
  });

  test("discount cannot exceed post-markup amount and cannot go negative", () => {
    const items = [li("labour", 1, 10)];
    const totals = calculateChangeOrderTotals(
      { markupType: "none", markupValue: 0, taxEnabled: false, taxPercentBasisPoints: 0, discountCents: dollarsToCents(999) },
      items
    );
    assert.equal(totals.discountCents, 1000);
    assert.equal(totals.taxableBaseCents, 0);
    assert.equal(totals.totalCents, 0);
  });

  test("negative/garbage discount input is clamped to zero, never negative total", () => {
    const items = [li("labour", 1, 10)];
    const totals = calculateChangeOrderTotals(
      { markupType: "none", markupValue: 0, taxEnabled: false, taxPercentBasisPoints: 0, discountCents: -500 },
      items
    );
    assert.equal(totals.discountCents, 0);
    assert.equal(totals.totalCents, 1000);
  });

  test("decimal hours and rounding stays deterministic", () => {
    const items = [li("labour", 1.33, 87.5)];
    const totals = calculateChangeOrderTotals(
      { markupType: "none", markupValue: 0, taxEnabled: false, taxPercentBasisPoints: 0, discountCents: 0 },
      items
    );
    assert.equal(totals.subtotalCents, 11638);
  });

  test("scenario D: CAD HST 15%", () => {
    const items = [li("labour", 5, 90)];
    const totals = calculateChangeOrderTotals(
      { markupType: "none", markupValue: 0, taxEnabled: true, taxPercentBasisPoints: 1500, discountCents: 0 },
      items
    );
    assert.equal(totals.subtotalCents, 45000);
    assert.equal(totals.taxCents, 6750);
    assert.equal(totals.totalCents, 51750);
  });

  test("multiple items across all categories sum correctly", () => {
    const items = [
      li("labour", 3, 80, 1),
      li("labour", 2, 45, 2),
      li("material", 6, 7.5, 3),
      li("material", 1, 38, 4),
      li("equipment", 1, 40, 5),
      li("subcontractor", 1, 500, 6),
    ];
    const totals = calculateChangeOrderTotals(
      { markupType: "none", markupValue: 0, taxEnabled: false, taxPercentBasisPoints: 0, discountCents: 0 },
      items
    );
    const expected = items.reduce((a, i) => a + i.amountCents, 0);
    assert.equal(totals.subtotalCents, expected);
    assert.equal(totals.labourSubtotalCents, dollarsToCents(240 + 90));
    assert.equal(totals.materialsSubtotalCents, dollarsToCents(45 + 38));
    assert.equal(totals.equipmentSubtotalCents, dollarsToCents(40));
    assert.equal(totals.subcontractorSubtotalCents, dollarsToCents(500));
  });

  test("zero-value line items produce a zero total without error", () => {
    const items = [li("labour", 0, 80)];
    const totals = calculateChangeOrderTotals(
      { markupType: "none", markupValue: 0, taxEnabled: false, taxPercentBasisPoints: 0, discountCents: 0 },
      items
    );
    assert.equal(totals.totalCents, 0);
  });

  test("large totals stay exact (no float drift) at six figures", () => {
    const items = [li("subcontractor", 1, 123456.78)];
    const totals = calculateChangeOrderTotals(
      { markupType: "percent", markupValue: 1000, taxEnabled: true, taxPercentBasisPoints: 1300, discountCents: 0 },
      items
    );
    assert.equal(totals.subtotalCents, 12345678);
    assert.equal(totals.markupCents, 1234568);
    const base = 12345678 + 1234568;
    assert.equal(totals.taxCents, Math.round((base * 1300) / 10000));
  });
});
