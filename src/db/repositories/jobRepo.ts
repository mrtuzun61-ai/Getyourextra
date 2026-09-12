import { v4 as uuid } from "uuid";
import { getDb } from "@/db/client";
import type { Job, JobStatus } from "@/types";

function rowToJob(row: any): Job {
  return {
    id: row.id,
    name: row.name,
    customerName: row.customerName,
    address: row.address,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    gcName: row.gcName,
    projectNumber: row.projectNumber,
    startDate: row.startDate,
    notes: row.notes,
    status: row.status as JobStatus,
    isSample: !!row.isSample,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export type JobInput = Omit<Job, "id" | "createdAt" | "updatedAt" | "isSample" | "status"> & {
  isSample?: boolean;
  status?: JobStatus;
};

export function createJob(input: JobInput): Job {
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();
  const status = input.status ?? "active";
  db.runSync(
    `INSERT INTO jobs (id, name, customerName, address, contactName, contactPhone, contactEmail,
      gcName, projectNumber, startDate, notes, status, isSample, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      input.name,
      input.customerName,
      input.address,
      input.contactName,
      input.contactPhone,
      input.contactEmail,
      input.gcName,
      input.projectNumber,
      input.startDate,
      input.notes,
      status,
      input.isSample ? 1 : 0,
      now,
      now,
    ]
  );
  return { ...input, id, status, isSample: !!input.isSample, createdAt: now, updatedAt: now };
}

export function updateJob(id: string, input: Partial<JobInput>): void {
  const db = getDb();
  const existing = getJobById(id);
  if (!existing) throw new Error("Job not found.");
  const merged = { ...existing, ...input };
  const now = new Date().toISOString();
  db.runSync(
    `UPDATE jobs SET name=?, customerName=?, address=?, contactName=?, contactPhone=?,
      contactEmail=?, gcName=?, projectNumber=?, startDate=?, notes=?, status=?, updatedAt=?
     WHERE id=?`,
    [
      merged.name,
      merged.customerName,
      merged.address,
      merged.contactName,
      merged.contactPhone,
      merged.contactEmail,
      merged.gcName,
      merged.projectNumber,
      merged.startDate,
      merged.notes,
      merged.status,
      now,
      id,
    ]
  );
}

export function getJobById(id: string): Job | null {
  const db = getDb();
  const row = db.getFirstSync<any>("SELECT * FROM jobs WHERE id = ?", [id]);
  return row ? rowToJob(row) : null;
}

export function listJobs(opts?: { search?: string; includeArchived?: boolean }): Job[] {
  const db = getDb();
  let sql = "SELECT * FROM jobs WHERE 1=1";
  const params: any[] = [];
  if (!opts?.includeArchived) {
    sql += " AND status != 'archived'";
  }
  if (opts?.search) {
    sql += " AND (name LIKE ? OR customerName LIKE ? OR gcName LIKE ?)";
    const like = `%${opts.search}%`;
    params.push(like, like, like);
  }
  sql += " ORDER BY updatedAt DESC";
  return db.getAllSync<any>(sql, params).map(rowToJob);
}

export function listRecentJobs(limit = 5): Job[] {
  const db = getDb();
  return db
    .getAllSync<any>("SELECT * FROM jobs WHERE status != 'archived' ORDER BY updatedAt DESC LIMIT ?", [limit])
    .map(rowToJob);
}

export function archiveJob(id: string): void {
  const db = getDb();
  db.runSync("UPDATE jobs SET status = 'archived', updatedAt = ? WHERE id = ?", [
    new Date().toISOString(),
    id,
  ]);
}

export function countOpenChangeOrdersForJob(jobId: string): number {
  const db = getDb();
  const row = db.getFirstSync<{ c: number }>(
    "SELECT COUNT(*) as c FROM change_orders WHERE jobId = ? AND status NOT IN ('paid','declined')",
    [jobId]
  );
  return row?.c ?? 0;
}

/** Seeds one clearly-labeled sample job for first-time exploration. Never mixed silently with real data. */
export function seedSampleJobIfNeeded(): void {
  const db = getDb();
  const row = db.getFirstSync<any>("SELECT id FROM jobs WHERE isSample = 1 LIMIT 1");
  if (row) return;
  createJob({
    name: "Office Renovation (Sample)",
    customerName: "ABC General Contracting",
    address: "500 Demo Ave, Sample City",
    contactName: "Jordan Lee",
    contactPhone: "",
    contactEmail: "",
    gcName: "ABC General Contracting",
    projectNumber: null,
    startDate: null,
    notes: "This is a sample job for exploring the app. You can archive it any time from Jobs.",
    status: "active",
    isSample: true,
  });
}
