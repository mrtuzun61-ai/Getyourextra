import type { ChangeOrder, ChangeOrderTotals, LineItem, MarkupType } from "../types/index.ts";
import { applyBasisPoints, clampNonNegative, sumCents } from "./money.ts";

/**
 * Deterministic change order calculation engine.
 *
 * Fixed order of operations:
 *   1. Sum line items per category -> category subtotals
 *   2. subtotal = sum of all category subtotals
 *   3. markup = f(subtotal, markupType, markupValue)
 *   4. postMarkup = subtotal + markup
 *   5. discount = clamp(discountCents, 0, postMarkup)  -- never negative, never exceeds postMarkup
 *   6. taxableBase = postMarkup - discount
 *   7. tax = taxEnabled ? taxableBase * taxRate : 0
 *   8. total = taxableBase + tax
 *
 * All intermediate values are integer cents.
 */
export function calculateMarkupCents(
  subtotalCents: number,
  markupType: MarkupType,
  markupValue: number
): number {
  switch (markupType) {
    case "none":
      return 0;
    case "percent":
      return applyBasisPoints(subtotalCents, markupValue);
    case "fixed":
      return Math.round(Number.isFinite(markupValue) ? markupValue : 0);
    default:
      return 0;
  }
}

export function calculateChangeOrderTotals(
  co: Pick<
    ChangeOrder,
    "markupType" | "markupValue" | "taxEnabled" | "taxPercentBasisPoints" | "discountCents"
  >,
  lineItems: LineItem[]
): ChangeOrderTotals {
  const byCategory = (cat: LineItem["category"]) =>
    sumCents(lineItems.filter((li) => li.category === cat).map((li) => li.amountCents));

  const labourSubtotalCents = byCategory("labour");
  const materialsSubtotalCents = byCategory("material");
  const equipmentSubtotalCents = byCategory("equipment");
  const subcontractorSubtotalCents = byCategory("subcontractor");

  const subtotalCents = sumCents([
    labourSubtotalCents,
    materialsSubtotalCents,
    equipmentSubtotalCents,
    subcontractorSubtotalCents,
  ]);

  const markupCents = calculateMarkupCents(subtotalCents, co.markupType, co.markupValue);
  const postMarkupCents = subtotalCents + markupCents;

  const discountCents = clampNonNegative(Math.min(Math.round(co.discountCents || 0), postMarkupCents));
  const taxableBaseCents = postMarkupCents - discountCents;

  const taxCents = co.taxEnabled ? applyBasisPoints(taxableBaseCents, co.taxPercentBasisPoints) : 0;
  const totalCents = taxableBaseCents + taxCents;

  return {
    labourSubtotalCents,
    materialsSubtotalCents,
    equipmentSubtotalCents,
    subcontractorSubtotalCents,
    subtotalCents,
    markupCents,
    discountCents,
    taxableBaseCents,
    taxCents,
    totalCents,
  };
}
