export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Returns "today", "1 day ago", "N days ago" for a past ISO timestamp; "" if no timestamp given. */
export function relativeDays(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

/**
 * Sanitizes a string for safe use as a filename across iOS and Android filesystems.
 * Strips characters that are invalid or risky on either platform, collapses
 * whitespace to hyphens, and truncates to a safe length.
 */
export function sanitizeFilename(input: string): string {
  const cleaned = (input ?? "")
    .normalize("NFKD")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const truncated = cleaned.slice(0, 80);
  return truncated.length > 0 ? truncated : "GetYourExtra-File";
}

export const REASON_LABELS: Record<string, string> = {
  owner_request: "Owner request",
  gc_instruction: "GC instruction",
  field_condition: "Field condition",
  design_change: "Design change",
  additional_quantity: "Additional quantity",
  rework_not_included: "Rework not included in contract",
  other: "Other",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  paid: "Paid",
  declined: "Declined",
};
