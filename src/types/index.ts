// All monetary values are stored and passed around as INTEGER MINOR UNITS (cents)
// to avoid floating point rounding errors. Never store money as a float.

export type Currency = "USD" | "CAD";

export type ChangeOrderStatus = "draft" | "sent" | "approved" | "paid" | "declined";

export type MarkupType = "none" | "percent" | "fixed";

export type LineItemCategory = "labour" | "material" | "equipment" | "subcontractor";

export interface CompanyProfile {
  id: string;
  companyName: string;
  logoUri: string | null;
  ownerName: string;
  trade: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  currency: Currency;
  taxEnabled: boolean;
  taxLabel: string;
  taxPercentBasisPoints: number;
  defaultLabourRateCents: number;
  defaultMarkupType: MarkupType;
  defaultMarkupValue: number;
  pdfFooterNote: string;
  licenseNumber: string | null;
  nextChangeOrderSeq: number;
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = "active" | "completed" | "archived";

export interface Job {
  id: string;
  name: string;
  customerName: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  gcName: string;
  projectNumber: string | null;
  startDate: string | null;
  notes: string | null;
  status: JobStatus;
  isSample: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LineItem {
  id: string;
  changeOrderId: string;
  category: LineItemCategory;
  description: string;
  quantity: number;
  unitRateCents: number;
  amountCents: number;
  sortOrder: number;
}

export interface ChangeOrderPhoto {
  id: string;
  changeOrderId: string;
  uri: string;
  caption: string | null;
  takenAt: string;
  sortOrder: number;
}

export interface Approval {
  id: string;
  changeOrderId: string;
  approverName: string;
  approverCompany: string;
  approverTitle: string | null;
  signatureUri: string;
  approvedAt: string;
}

export interface PaymentRecord {
  id: string;
  changeOrderId: string;
  paidAt: string;
  paymentDate: string;
  note: string | null;
}

export type ExtraReason =
  | "owner_request"
  | "gc_instruction"
  | "field_condition"
  | "design_change"
  | "additional_quantity"
  | "rework_not_included"
  | "other";

export interface ChangeOrder {
  id: string;
  jobId: string;
  number: string;
  revisionOf: string | null;
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

  status: ChangeOrderStatus;
  isSample: boolean;

  createdAt: string;
  sentAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  updatedAt: string;
}

export interface ChangeOrderTotals {
  labourSubtotalCents: number;
  materialsSubtotalCents: number;
  equipmentSubtotalCents: number;
  subcontractorSubtotalCents: number;
  subtotalCents: number;
  markupCents: number;
  discountCents: number;
  taxableBaseCents: number;
  taxCents: number;
  totalCents: number;
}

export interface ChangeOrderFull {
  changeOrder: ChangeOrder;
  job: Job;
  lineItems: LineItem[];
  photos: ChangeOrderPhoto[];
  approval: Approval | null;
  payment: PaymentRecord | null;
  totals: ChangeOrderTotals;
}
