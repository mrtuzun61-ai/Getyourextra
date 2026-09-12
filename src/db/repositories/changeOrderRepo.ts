import { v4 as uuid } from "uuid";
import { getDb } from "@/db/client";
import { reserveNextChangeOrderNumber } from "@/db/repositories/companyRepo";
import { getJobById } from "@/db/repositories/jobRepo";
import { calculateChangeOrderTotals } from "@/lib/calc";
import { nextRevisionNumber } from "@/lib/coNumber";
import { isBlockedStatusTransition, wouldChangeApprovedPricing as pureWouldChange } from "@/lib/statusHelpers";
import type {
  Approval,
  ChangeOrder,
  ChangeOrderFull,
  ChangeOrderPhoto,
  ChangeOrderStatus,
  ExtraReason,
  LineItem,
  LineItemCategory,
  MarkupType,
  PaymentRecord,
} from "@/types";

function rowToChangeOrder(row: any): ChangeOrder {
  return {
    id: row.id,
    jobId: row.jobId,
    number: row.number,
    revisionOf: row.revisionOf,
    title: row.title,
    description: row.description,
    requestedByName: row.requestedByName,
    requestedByCompany: row.requestedByCompany,
    requestedByRole: row.requestedByRole,
    requestedAt: row.requestedAt,
    reason: row.reason as ExtraReason,
    siteNotes: row.siteNotes,
    markupType: row.markupType as MarkupType,
    markupValue: row.markupValue,
    taxEnabled: !!row.taxEnabled,
    taxLabel: row.taxLabel,
    taxPercentBasisPoints: row.taxPercentBasisPoints,
    discountCents: row.discountCents,
    status: row.status as ChangeOrderStatus,
    isSample: !!row.isSample,
    createdAt: row.createdAt,
    sentAt: row.sentAt,
    approvedAt: row.approvedAt,
    paidAt: row.paidAt,
    updatedAt: row.updatedAt,
  };
}

function rowToLineItem(row: any): LineItem {
  return {
    id: row.id,
    changeOrderId: row.changeOrderId,
    category: row.category as LineItemCategory,
    description: row.description,
    quantity: row.quantity,
    unitRateCents: row.unitRateCents,
    amountCents: row.amountCents,
    sortOrder: row.sortOrder,
  };
}

function rowToPhoto(row: any): ChangeOrderPhoto {
  return {
    id: row.id,
    changeOrderId: row.changeOrderId,
    uri: row.uri,
    caption: row.caption,
    takenAt: row.takenAt,
    sortOrder: row.sortOrder,
  };
}

function rowToApproval(row: any): Approval {
  return {
    id: row.id,
    changeOrderId: row.changeOrderId,
    approverName: row.approverName,
    approverCompany: row.approverCompany,
    approverTitle: row.approverTitle,
    signatureUri: row.signatureUri,
    approvedAt: row.approvedAt,
  };
}

function rowToPayment(row: any): PaymentRecord {
  return {
    id: row.id,
    changeOrderId: row.changeOrderId,
    paidAt: row.paidAt,
    paymentDate: row.paymentDate,
    note: row.note,
  };
}

export interface LineItemInput {
  category: LineItemCategory;
  description: string;
  quantity: number;
  unitRateCents: number;
  amountCents: number;
}

export interface PhotoInput {
  uri: string;
  caption: string | null;
  takenAt: string;
}

export interface ChangeOrderInput {
  jobId: string;
  title: string;
  description: string;
  requestedByName: string;
  requestedByCompany: string;
  requestedByRole: string | null;
  requestedAt: string;
  reason: ExtraReason;
  siteNotes: string | null;
  markupType: MarkupType;
  markupValue: number;
  taxEnabled: boolean;
  taxLabel: string;
  taxPercentBasisPoints: number;
  discountCents: number;
  lineItems: LineItemInput[];
  photos: PhotoInput[];
}

function insertLineItems(changeOrderId: string, items: LineItemInput[]) {
  const db = getDb();
  items.forEach((li, idx) => {
    db.runSync(
      `INSERT INTO line_items (id, changeOrderId, category, description, quantity, unitRateCents, amountCents, sortOrder)
       VALUES (?,?,?,?,?,?,?,?)`,
      [uuid(), changeOrderId, li.category, li.description, li.quantity, li.unitRateCents, li.amountCents, idx]
    );
  });
}

function insertPhotos(changeOrderId: string, photos: PhotoInput[]) {
  const db = getDb();
  photos.forEach((p, idx) => {
    db.runSync(
      `INSERT INTO change_order_photos (id, changeOrderId, uri, caption, takenAt, sortOrder)
       VALUES (?,?,?,?,?,?)`,
      [uuid(), changeOrderId, p.uri, p.caption, p.takenAt, idx]
    );
  });
}

export function createChangeOrder(
  input: ChangeOrderInput,
  opts?: { status?: ChangeOrderStatus; isSample?: boolean }
): ChangeOrder {
  if (!input.jobId) throw new Error("A job is required to create a change order.");
  if (!input.lineItems || input.lineItems.length === 0) {
    throw new Error("At least one line item is required.");
  }

  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();
  const number = reserveNextChangeOrderNumber();
  const status = opts?.status ?? "draft";

  db.runSync(
    `INSERT INTO change_orders (
      id, jobId, number, revisionOf, title, description, requestedByName, requestedByCompany,
      requestedByRole, requestedAt, reason, siteNotes, markupType, markupValue, taxEnabled,
      taxLabel, taxPercentBasisPoints, discountCents, status, isSample, createdAt, sentAt,
      approvedAt, paidAt, updatedAt
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      input.jobId,
      number,
      null,
      input.title,
      input.description,
      input.requestedByName,
      input.requestedByCompany,
      input.requestedByRole,
      input.requestedAt,
      input.reason,
      input.siteNotes,
      input.markupType,
      input.markupValue,
      input.taxEnabled ? 1 : 0,
      input.taxLabel,
      input.taxPercentBasisPoints,
      input.discountCents,
      status,
      opts?.isSample ? 1 : 0,
      now,
      null,
      null,
      null,
      now,
    ]
  );

  insertLineItems(id, input.lineItems);
  insertPhotos(id, input.photos);

  return getChangeOrderById(id)!;
}

export function getChangeOrderById(id: string): ChangeOrder | null {
  const db = getDb();
  const row = db.getFirstSync<any>("SELECT * FROM change_orders WHERE id = ?", [id]);
  return row ? rowToChangeOrder(row) : null;
}

export function getLineItems(changeOrderId: string): LineItem[] {
  const db = getDb();
  return db
    .getAllSync<any>("SELECT * FROM line_items WHERE changeOrderId = ? ORDER BY sortOrder ASC", [changeOrderId])
    .map(rowToLineItem);
}

export function getPhotos(changeOrderId: string): ChangeOrderPhoto[] {
  const db = getDb();
  return db
    .getAllSync<any>("SELECT * FROM change_order_photos WHERE changeOrderId = ? ORDER BY sortOrder ASC", [
      changeOrderId,
    ])
    .map(rowToPhoto);
}

export function getApproval(changeOrderId: string): Approval | null {
  const db = getDb();
  const row = db.getFirstSync<any>("SELECT * FROM approvals WHERE changeOrderId = ?", [changeOrderId]);
  return row ? rowToApproval(row) : null;
}

export function getPayment(changeOrderId: string): PaymentRecord | null {
  const db = getDb();
  const row = db.getFirstSync<any>("SELECT * FROM payment_records WHERE changeOrderId = ?", [changeOrderId]);
  return row ? rowToPayment(row) : null;
}

export function getChangeOrderFull(id: string): ChangeOrderFull | null {
  const co = getChangeOrderById(id);
  if (!co) return null;
  const job = getJobById(co.jobId);
  if (!job) return null;
  const lineItems = getLineItems(id);
  const photos = getPhotos(id);
  const approval = getApproval(id);
  const payment = getPayment(id);
  const totals = calculateChangeOrderTotals(co, lineItems);
  return { changeOrder: co, job, lineItems, photos, approval, payment, totals };
}

export interface ChangeOrderListFilters {
  status?: ChangeOrderStatus | "unpaid" | "all";
  jobId?: string;
  search?: string;
  sort?: "newest" | "oldest" | "highest" | "lowest";
}

export function listChangeOrders(filters?: ChangeOrderListFilters): ChangeOrderFull[] {
  const db = getDb();
  let sql = `SELECT co.id FROM change_orders co JOIN jobs j ON j.id = co.jobId WHERE 1=1`;
  const params: any[] = [];

  if (filters?.jobId) {
    sql += " AND co.jobId = ?";
    params.push(filters.jobId);
  }
  if (filters?.status && filters.status !== "all" && filters.status !== "unpaid") {
    sql += " AND co.status = ?";
    params.push(filters.status);
  }
  if (filters?.status === "unpaid") {
    sql += " AND co.status = 'approved'";
  }
  if (filters?.search) {
    sql +=
      " AND (co.title LIKE ? OR co.description LIKE ? OR co.number LIKE ? OR j.name LIKE ? OR j.customerName LIKE ?)";
    const like = `%${filters.search}%`;
    params.push(like, like, like, like, like);
  }

  const rows = db.getAllSync<{ id: string }>(sql, params);
  const fulls = rows.map((row) => getChangeOrderFull(row.id)).filter((x): x is ChangeOrderFull => x !== null);

  const sort = filters?.sort ?? "newest";
  fulls.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return a.changeOrder.createdAt.localeCompare(b.changeOrder.createdAt);
      case "highest":
        return b.totals.totalCents - a.totals.totalCents;
      case "lowest":
        return a.totals.totalCents - b.totals.totalCents;
      case "newest":
      default:
        return b.changeOrder.createdAt.localeCompare(a.changeOrder.createdAt);
    }
  });

  return fulls;
}

export function updateChangeOrderStatus(id: string, status: ChangeOrderStatus): void {
  const existing = getChangeOrderById(id);
  if (!existing) throw new Error("Change order not found.");
  if (isBlockedStatusTransition(existing.status, status)) {
    throw new Error(`Cannot move a ${existing.status} change order to ${status}.`);
  }

  const db = getDb();
  const now = new Date().toISOString();
  const timestampField =
    status === "sent" ? "sentAt" : status === "approved" ? "approvedAt" : status === "paid" ? "paidAt" : null;

  if (timestampField) {
    db.runSync(
      `UPDATE change_orders SET status = ?, ${timestampField} = COALESCE(${timestampField}, ?), updatedAt = ? WHERE id = ?`,
      [status, now, now, id]
    );
  } else {
    db.runSync(`UPDATE change_orders SET status = ?, updatedAt = ? WHERE id = ?`, [status, now, id]);
  }
}

export interface UpdateChangeOrderInput {
  title?: string;
  description?: string;
  requestedByName?: string;
  requestedByCompany?: string;
  requestedByRole?: string | null;
  requestedAt?: string;
  reason?: ExtraReason;
  siteNotes?: string | null;
  markupType?: MarkupType;
  markupValue?: number;
  taxEnabled?: boolean;
  taxLabel?: string;
  taxPercentBasisPoints?: number;
  discountCents?: number;
  lineItems?: LineItemInput[];
  photos?: PhotoInput[];
}

/** True if this edit would materially change scope/pricing on a change order that is already approved or paid. */
export function wouldChangeApprovedPricing(
  existing: ChangeOrderFull,
  updates: UpdateChangeOrderInput
): boolean {
  return pureWouldChange(
    existing.changeOrder.status,
    {
      description: existing.changeOrder.description,
      markupType: existing.changeOrder.markupType,
      markupValue: existing.changeOrder.markupValue,
      taxEnabled: existing.changeOrder.taxEnabled,
      taxPercentBasisPoints: existing.changeOrder.taxPercentBasisPoints,
      discountCents: existing.changeOrder.discountCents,
    },
    {
      description: updates.description,
      lineItemsChanged: updates.lineItems !== undefined,
      markupType: updates.markupType,
      markupValue: updates.markupValue,
      taxEnabled: updates.taxEnabled,
      taxPercentBasisPoints: updates.taxPercentBasisPoints,
      discountCents: updates.discountCents,
    }
  );
}

export function updateChangeOrder(id: string, updates: UpdateChangeOrderInput): void {
  const existing = getChangeOrderById(id);
  if (!existing) throw new Error("Change order not found.");
  if (updates.lineItems !== undefined && updates.lineItems.length === 0) {
    throw new Error("At least one line item is required.");
  }

  const db = getDb();
  const merged = { ...existing, ...updates };
  const now = new Date().toISOString();

  db.runSync(
    `UPDATE change_orders SET
      title=?, description=?, requestedByName=?, requestedByCompany=?, requestedByRole=?,
      requestedAt=?, reason=?, siteNotes=?, markupType=?, markupValue=?, taxEnabled=?,
      taxLabel=?, taxPercentBasisPoints=?, discountCents=?, updatedAt=?
    WHERE id=?`,
    [
      merged.title,
      merged.description,
      merged.requestedByName,
      merged.requestedByCompany,
      merged.requestedByRole,
      merged.requestedAt,
      merged.reason,
      merged.siteNotes,
      merged.markupType,
      merged.markupValue,
      merged.taxEnabled ? 1 : 0,
      merged.taxLabel,
      merged.taxPercentBasisPoints,
      merged.discountCents,
      now,
      id,
    ]
  );

  if (updates.lineItems) {
    db.runSync("DELETE FROM line_items WHERE changeOrderId = ?", [id]);
    insertLineItems(id, updates.lineItems);
  }
  if (updates.photos) {
    db.runSync("DELETE FROM change_order_photos WHERE changeOrderId = ?", [id]);
    insertPhotos(id, updates.photos);
  }
}

/**
 * Creates a new revision (e.g. CO-0018-R1) that copies the original scope/pricing
 * (or the provided updates) and links back to it via revisionOf, preserving the
 * original approved record untouched.
 */
export function createRevision(originalId: string, updates: UpdateChangeOrderInput): ChangeOrder {
  const original = getChangeOrderFull(originalId);
  if (!original) throw new Error("Original change order not found.");

  const db = getDb();
  const revisionCountRow = db.getFirstSync<{ c: number }>(
    "SELECT COUNT(*) as c FROM change_orders WHERE revisionOf = ?",
    [originalId]
  );
  const revisionCount = revisionCountRow?.c ?? 0;
  const number = nextRevisionNumber(original.changeOrder.number, revisionCount);

  const id = uuid();
  const now = new Date().toISOString();
  const merged = { ...original.changeOrder, ...updates };

  db.runSync(
    `INSERT INTO change_orders (
      id, jobId, number, revisionOf, title, description, requestedByName, requestedByCompany,
      requestedByRole, requestedAt, reason, siteNotes, markupType, markupValue, taxEnabled,
      taxLabel, taxPercentBasisPoints, discountCents, status, isSample, createdAt, sentAt,
      approvedAt, paidAt, updatedAt
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      original.changeOrder.jobId,
      number,
      originalId,
      merged.title,
      merged.description,
      merged.requestedByName,
      merged.requestedByCompany,
      merged.requestedByRole,
      merged.requestedAt,
      merged.reason,
      merged.siteNotes,
      merged.markupType,
      merged.markupValue,
      merged.taxEnabled ? 1 : 0,
      merged.taxLabel,
      merged.taxPercentBasisPoints,
      merged.discountCents,
      "draft",
      original.changeOrder.isSample ? 1 : 0,
      now,
      null,
      null,
      null,
      now,
    ]
  );

  const lineItems: LineItemInput[] =
    updates.lineItems ??
    original.lineItems.map((li) => ({
      category: li.category,
      description: li.description,
      quantity: li.quantity,
      unitRateCents: li.unitRateCents,
      amountCents: li.amountCents,
    }));
  insertLineItems(id, lineItems);

  const photos: PhotoInput[] =
    updates.photos ?? original.photos.map((p) => ({ uri: p.uri, caption: p.caption, takenAt: p.takenAt }));
  insertPhotos(id, photos);

  return getChangeOrderById(id)!;
}

export function recordApproval(changeOrderId: string, approval: Omit<Approval, "id" | "changeOrderId">): void {
  const existing = getChangeOrderById(changeOrderId);
  if (!existing) throw new Error("Change order not found.");
  if (isBlockedStatusTransition(existing.status, "approved")) {
    throw new Error(`Cannot approve a ${existing.status} change order.`);
  }

  const db = getDb();
  const existingApproval = getApproval(changeOrderId);
  if (existingApproval) {
    db.runSync(
      `UPDATE approvals SET approverName=?, approverCompany=?, approverTitle=?, signatureUri=?, approvedAt=?
       WHERE changeOrderId=?`,
      [
        approval.approverName,
        approval.approverCompany,
        approval.approverTitle,
        approval.signatureUri,
        approval.approvedAt,
        changeOrderId,
      ]
    );
  } else {
    db.runSync(
      `INSERT INTO approvals (id, changeOrderId, approverName, approverCompany, approverTitle, signatureUri, approvedAt)
       VALUES (?,?,?,?,?,?,?)`,
      [
        uuid(),
        changeOrderId,
        approval.approverName,
        approval.approverCompany,
        approval.approverTitle,
        approval.signatureUri,
        approval.approvedAt,
      ]
    );
  }
  updateChangeOrderStatus(changeOrderId, "approved");
}

export function recordPayment(changeOrderId: string, paymentDate: string, note: string | null): void {
  const existing = getChangeOrderById(changeOrderId);
  if (!existing) throw new Error("Change order not found.");

  const db = getDb();
  const now = new Date().toISOString();
  const existingPayment = getPayment(changeOrderId);
  if (existingPayment) {
    db.runSync("UPDATE payment_records SET paymentDate=?, note=? WHERE changeOrderId=?", [
      paymentDate,
      note,
      changeOrderId,
    ]);
  } else {
    db.runSync(`INSERT INTO payment_records (id, changeOrderId, paidAt, paymentDate, note) VALUES (?,?,?,?,?)`, [
      uuid(),
      changeOrderId,
      now,
      paymentDate,
      note,
    ]);
  }
  updateChangeOrderStatus(changeOrderId, "paid");
}

export interface DashboardTotals {
  outstandingCents: number;
  pendingApprovalCents: number;
  paidCents: number;
  totalExtrasCents: number;
  needsAttention: ChangeOrderFull[];
}

const ATTENTION_SENT_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 3; // 3 days

export function getDashboardTotals(): DashboardTotals {
  const all = listChangeOrders({ status: "all" });

  const outstandingCents = sumWhere(all, (c) => c.changeOrder.status === "approved");
  const pendingApprovalCents = sumWhere(all, (c) => c.changeOrder.status === "sent");
  const paidCents = sumWhere(all, (c) => c.changeOrder.status === "paid");
  const totalExtrasCents = all.reduce((a, c) => a + c.totals.totalCents, 0);

  const now = Date.now();
  const needsAttention = all
    .filter((c) => {
      if (c.changeOrder.status === "sent") {
        const sentAt = c.changeOrder.sentAt ? new Date(c.changeOrder.sentAt).getTime() : now;
        return now - sentAt > ATTENTION_SENT_THRESHOLD_MS;
      }
      return c.changeOrder.status === "approved";
    })
    .slice(0, 10);

  return { outstandingCents, pendingApprovalCents, paidCents, totalExtrasCents, needsAttention };
}

function sumWhere(items: ChangeOrderFull[], pred: (c: ChangeOrderFull) => boolean): number {
  return items.filter(pred).reduce((a, c) => a + c.totals.totalCents, 0);
}
