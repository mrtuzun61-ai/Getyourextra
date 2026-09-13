import * as SQLite from "expo-sqlite";

const DB_NAME = "getyourextra.db";
const CURRENT_SCHEMA_VERSION = 2;

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  return dbInstance;
}

/**
 * Creates the schema and runs versioned migrations. Safe to call on every app
 * start. New migrations must be appended, never edited, once shipped, so that
 * devices that already ran an earlier version upgrade correctly.
 */
export async function initDatabase(): Promise<void> {
  const db = getDb();

  db.execSync("PRAGMA journal_mode = WAL;");
  db.execSync("PRAGMA foreign_keys = ON;");

  db.execSync(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const row = db.getFirstSync<{ value: string }>("SELECT value FROM schema_meta WHERE key = 'version'");
  const currentVersion = row ? parseInt(row.value, 10) : 0;

  if (currentVersion < 1) {
    runMigrationV1(db);
  }

  if (currentVersion < 2) {
    runMigrationV2(db);
  }

  db.runSync(
    `INSERT INTO schema_meta (key, value) VALUES ('version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [String(CURRENT_SCHEMA_VERSION)]
  );
}

function runMigrationV1(db: SQLite.SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS company_profile (
      id TEXT PRIMARY KEY,
      companyName TEXT NOT NULL,
      logoUri TEXT,
      ownerName TEXT NOT NULL,
      trade TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      region TEXT NOT NULL,
      postalCode TEXT NOT NULL,
      country TEXT NOT NULL,
      currency TEXT NOT NULL,
      taxEnabled INTEGER NOT NULL,
      taxLabel TEXT NOT NULL,
      taxPercentBasisPoints INTEGER NOT NULL,
      defaultLabourRateCents INTEGER NOT NULL,
      defaultMarkupType TEXT NOT NULL,
      defaultMarkupValue INTEGER NOT NULL,
      pdfFooterNote TEXT NOT NULL,
      licenseNumber TEXT,
      nextChangeOrderSeq INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      customerName TEXT NOT NULL,
      address TEXT NOT NULL,
      contactName TEXT NOT NULL,
      contactPhone TEXT NOT NULL,
      contactEmail TEXT NOT NULL,
      gcName TEXT NOT NULL,
      projectNumber TEXT,
      startDate TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      isSample INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS change_orders (
      id TEXT PRIMARY KEY,
      jobId TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      number TEXT NOT NULL UNIQUE,
      revisionOf TEXT REFERENCES change_orders(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      requestedByName TEXT NOT NULL,
      requestedByCompany TEXT NOT NULL,
      requestedByRole TEXT,
      requestedAt TEXT NOT NULL,
      reason TEXT NOT NULL,
      siteNotes TEXT,
      markupType TEXT NOT NULL,
      markupValue INTEGER NOT NULL,
      taxEnabled INTEGER NOT NULL,
      taxLabel TEXT NOT NULL,
      taxPercentBasisPoints INTEGER NOT NULL,
      discountCents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      isSample INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      sentAt TEXT,
      approvedAt TEXT,
      paidAt TEXT,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS line_items (
      id TEXT PRIMARY KEY,
      changeOrderId TEXT NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      quantity REAL NOT NULL,
      unitRateCents INTEGER NOT NULL,
      amountCents INTEGER NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS change_order_photos (
      id TEXT PRIMARY KEY,
      changeOrderId TEXT NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,
      uri TEXT NOT NULL,
      caption TEXT,
      takenAt TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      changeOrderId TEXT NOT NULL UNIQUE REFERENCES change_orders(id) ON DELETE CASCADE,
      approverName TEXT NOT NULL,
      approverCompany TEXT NOT NULL,
      approverTitle TEXT,
      signatureUri TEXT NOT NULL,
      approvedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_records (
      id TEXT PRIMARY KEY,
      changeOrderId TEXT NOT NULL UNIQUE REFERENCES change_orders(id) ON DELETE CASCADE,
      paidAt TEXT NOT NULL,
      paymentDate TEXT NOT NULL,
      note TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_change_orders_jobId ON change_orders(jobId);
    CREATE INDEX IF NOT EXISTS idx_line_items_changeOrderId ON line_items(changeOrderId);
    CREATE INDEX IF NOT EXISTS idx_photos_changeOrderId ON change_order_photos(changeOrderId);
  `);
}

function runMigrationV2(db: SQLite.SQLiteDatabase) {
  const columns = db.getAllSync<{ name: string }>("PRAGMA table_info(company_profile)");
  const hasUserRole = columns.some((column) => column.name === "userRole");
  if (!hasUserRole) {
    db.execSync(`ALTER TABLE company_profile ADD COLUMN userRole TEXT NOT NULL DEFAULT '';`);
  }
}

/** Drops and recreates all tables. Intended for developer/manual QA use only, never called by the app UI. */
export async function resetDatabaseForTesting(): Promise<void> {
  const db = getDb();
  db.execSync(`
    DROP TABLE IF EXISTS payment_records;
    DROP TABLE IF EXISTS approvals;
    DROP TABLE IF EXISTS change_order_photos;
    DROP TABLE IF EXISTS line_items;
    DROP TABLE IF EXISTS change_orders;
    DROP TABLE IF EXISTS jobs;
    DROP TABLE IF EXISTS company_profile;
    DROP TABLE IF EXISTS schema_meta;
  `);
  await initDatabase();
}
