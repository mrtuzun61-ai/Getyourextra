import type { ChangeOrderStatus } from "../types/index.ts";

/**
 * Status helper logic, kept pure and dependency-free so it can be unit tested
 * without a database. The repository layer calls into these functions.
 */

export const TERMINAL_STATUSES: ChangeOrderStatus[] = ["paid", "declined"];

export function isTerminalStatus(status: ChangeOrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** True once a change order has captured a customer/GC approval (approved or paid). */
export function isApprovedOrPaid(status: ChangeOrderStatus): boolean {
  return status === "approved" || status === "paid";
}

/**
 * The "natural" forward flow is Draft -> Sent -> Approved -> Paid, but the app
 * allows practical manual correction (e.g. Draft -> Approved when a signature
 * is captured in person without ever being formally "sent"). This function
 * only flags transitions that should never be allowed at all.
 */
export function isBlockedStatusTransition(from: ChangeOrderStatus, to: ChangeOrderStatus): boolean {
  if (from === to) return false;
  // Paid is a deliberate final action; nothing should silently move a paid CO backward.
  if (from === "paid" && to !== "paid") return true;
  // Declined is terminal for V1; reopening requires creating a revision instead.
  if (from === "declined" && to !== "declined") return true;
  return false;
}

export interface PricingAffectingFields {
  description?: string;
  lineItemsChanged?: boolean;
  markupType?: string;
  markupValue?: number;
  taxEnabled?: boolean;
  taxPercentBasisPoints?: number;
  discountCents?: number;
}

export interface ExistingPricingFields {
  description: string;
  markupType: string;
  markupValue: number;
  taxEnabled: boolean;
  taxPercentBasisPoints: number;
  discountCents: number;
}

/**
 * Determines whether a proposed edit would change the scope or pricing of a
 * change order that has already been approved (or paid). If true, the caller
 * should route the edit through "Create Revision" instead of mutating the
 * approved record directly, to protect approval integrity.
 */
export function wouldChangeApprovedPricing(
  currentStatus: ChangeOrderStatus,
  existing: ExistingPricingFields,
  updates: PricingAffectingFields
): boolean {
  if (!isApprovedOrPaid(currentStatus)) return false;

  if (updates.description !== undefined && updates.description !== existing.description) return true;
  if (updates.lineItemsChanged) return true;
  if (updates.markupType !== undefined && updates.markupType !== existing.markupType) return true;
  if (updates.markupValue !== undefined && updates.markupValue !== existing.markupValue) return true;
  if (updates.taxEnabled !== undefined && updates.taxEnabled !== existing.taxEnabled) return true;
  if (
    updates.taxPercentBasisPoints !== undefined &&
    updates.taxPercentBasisPoints !== existing.taxPercentBasisPoints
  )
    return true;
  if (updates.discountCents !== undefined && updates.discountCents !== existing.discountCents) return true;

  return false;
}
