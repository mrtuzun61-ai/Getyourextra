/**
 * Pure numbering logic, kept separate from the SQLite repository so it can be
 * unit tested without any native dependency.
 */

/** Formats a sequence integer as a zero-padded change order number, e.g. 7 -> "CO-0007". */
export function formatChangeOrderNumber(seq: number): string {
  if (!Number.isFinite(seq) || seq < 1) {
    throw new Error(`Invalid change order sequence number: ${seq}`);
  }
  return `CO-${String(Math.floor(seq)).padStart(4, "0")}`;
}

/** Extracts the base number from a (possibly already-revised) CO number, e.g. "CO-0018-R2" -> "CO-0018". */
export function baseChangeOrderNumber(number: string): string {
  return number.split("-R")[0];
}

/**
 * Computes the next revision number for a change order given the base number and the
 * count of revisions that already exist for it (not including the original).
 * Example: baseNumber "CO-0018", existingRevisionCount 0 -> "CO-0018-R1"
 *          baseNumber "CO-0018", existingRevisionCount 1 -> "CO-0018-R2"
 */
export function nextRevisionNumber(originalNumber: string, existingRevisionCount: number): string {
  if (existingRevisionCount < 0) {
    throw new Error("existingRevisionCount cannot be negative");
  }
  const base = baseChangeOrderNumber(originalNumber);
  return `${base}-R${existingRevisionCount + 1}`;
}

/** True if the given CO number string is a revision (contains "-R" followed by digits). */
export function isRevisionNumber(number: string): boolean {
  return /-R\d+$/.test(number);
}
