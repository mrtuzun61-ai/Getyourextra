import { getDb } from "@/db/client";
import { formatChangeOrderNumber } from "@/lib/coNumber";
import type { CompanyProfile, Currency, MarkupType } from "@/types";

const SINGLETON_ID = "company-profile-singleton";

function rowToCompany(row: any): CompanyProfile {
  return {
    id: row.id,
    companyName: row.companyName,
    logoUri: row.logoUri,
    ownerName: row.ownerName,
    userRole: row.userRole ?? "",
    trade: row.trade,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    region: row.region,
    postalCode: row.postalCode,
    country: row.country,
    currency: row.currency as Currency,
    taxEnabled: !!row.taxEnabled,
    taxLabel: row.taxLabel,
    taxPercentBasisPoints: row.taxPercentBasisPoints,
    defaultLabourRateCents: row.defaultLabourRateCents,
    defaultMarkupType: row.defaultMarkupType as MarkupType,
    defaultMarkupValue: row.defaultMarkupValue,
    pdfFooterNote: row.pdfFooterNote,
    licenseNumber: row.licenseNumber,
    nextChangeOrderSeq: row.nextChangeOrderSeq,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getCompanyProfile(): CompanyProfile | null {
  const db = getDb();
  const row = db.getFirstSync<any>("SELECT * FROM company_profile WHERE id = ?", [SINGLETON_ID]);
  return row ? rowToCompany(row) : null;
}

export function hasCompletedCompanySetup(): boolean {
  return getCompanyProfile() !== null;
}

export type CompanyProfileInput = Omit<
  CompanyProfile,
  "id" | "nextChangeOrderSeq" | "createdAt" | "updatedAt"
>;

export function saveCompanyProfile(input: CompanyProfileInput): CompanyProfile {
  const db = getDb();
  const existing = getCompanyProfile();
  const now = new Date().toISOString();

  if (existing) {
    db.runSync(
      `UPDATE company_profile SET
        companyName=?, logoUri=?, ownerName=?, userRole=?, trade=?, phone=?, email=?, address=?,
        city=?, region=?, postalCode=?, country=?, currency=?, taxEnabled=?, taxLabel=?,
        taxPercentBasisPoints=?, defaultLabourRateCents=?, defaultMarkupType=?,
        defaultMarkupValue=?, pdfFooterNote=?, licenseNumber=?, updatedAt=?
      WHERE id=?`,
      [
        input.companyName,
        input.logoUri,
        input.ownerName,
        input.userRole,
        input.trade,
        input.phone,
        input.email,
        input.address,
        input.city,
        input.region,
        input.postalCode,
        input.country,
        input.currency,
        input.taxEnabled ? 1 : 0,
        input.taxLabel,
        input.taxPercentBasisPoints,
        input.defaultLabourRateCents,
        input.defaultMarkupType,
        input.defaultMarkupValue,
        input.pdfFooterNote,
        input.licenseNumber,
        now,
        existing.id,
      ]
    );
    return { ...existing, ...input, updatedAt: now };
  }

  const id = SINGLETON_ID;
  db.runSync(
    `INSERT INTO company_profile (
      id, companyName, logoUri, ownerName, userRole, trade, phone, email, address, city, region,
      postalCode, country, currency, taxEnabled, taxLabel, taxPercentBasisPoints,
      defaultLabourRateCents, defaultMarkupType, defaultMarkupValue, pdfFooterNote,
      licenseNumber, nextChangeOrderSeq, createdAt, updatedAt
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      input.companyName,
      input.logoUri,
      input.ownerName,
      input.userRole,
      input.trade,
      input.phone,
      input.email,
      input.address,
      input.city,
      input.region,
      input.postalCode,
      input.country,
      input.currency,
      input.taxEnabled ? 1 : 0,
      input.taxLabel,
      input.taxPercentBasisPoints,
      input.defaultLabourRateCents,
      input.defaultMarkupType,
      input.defaultMarkupValue,
      input.pdfFooterNote,
      input.licenseNumber,
      1,
      now,
      now,
    ]
  );

  return { ...input, id, nextChangeOrderSeq: 1, createdAt: now, updatedAt: now };
}

/**
 * Atomically reserves the next change order sequence number and returns the
 * formatted CO number (e.g. "CO-0007"). Because expo-sqlite's sync API runs
 * on a single JS thread without concurrent writers, the read-then-increment
 * here cannot race within this app.
 */
export function reserveNextChangeOrderNumber(): string {
  const db = getDb();
  const profile = getCompanyProfile();
  if (!profile) throw new Error("Company profile must exist before creating change orders.");
  const seq = profile.nextChangeOrderSeq;
  db.runSync("UPDATE company_profile SET nextChangeOrderSeq = ?, updatedAt = ? WHERE id = ?", [
    seq + 1,
    new Date().toISOString(),
    profile.id,
  ]);
  return formatChangeOrderNumber(seq);
}
