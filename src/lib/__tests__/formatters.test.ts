import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatDate, formatDateTime, relativeDays, sanitizeFilename } from "../formatters.ts";

describe("formatters", () => {
  test("formatDate handles null/undefined gracefully", () => {
    assert.equal(formatDate(null), "—");
    assert.equal(formatDate(undefined), "—");
  });

  test("formatDate handles invalid date strings gracefully", () => {
    assert.equal(formatDate("not-a-date"), "—");
  });

  test("formatDate formats a valid ISO date", () => {
    const result = formatDate("2026-03-15T12:00:00.000Z");
    assert.ok(result.includes("2026"));
  });

  test("formatDateTime handles null/invalid gracefully", () => {
    assert.equal(formatDateTime(null), "—");
    assert.equal(formatDateTime("garbage"), "—");
  });

  test("relativeDays returns empty string for missing input", () => {
    assert.equal(relativeDays(null), "");
    assert.equal(relativeDays(undefined), "");
  });

  test("relativeDays returns 'today' for a timestamp from a few minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    assert.equal(relativeDays(fiveMinAgo), "today");
  });

  test("relativeDays returns '1 day ago' and 'N days ago' correctly", () => {
    const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    assert.equal(relativeDays(oneDayAgo), "1 day ago");
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 60 * 1000).toISOString();
    assert.equal(relativeDays(fiveDaysAgo), "5 days ago");
  });

  test("sanitizeFilename strips unsafe characters", () => {
    assert.equal(sanitizeFilename('CO-0008: Smith "Residence" / Extra?'), "CO-0008-Smith-Residence-Extra");
  });

  test("sanitizeFilename handles empty input without producing an empty filename", () => {
    assert.equal(sanitizeFilename(""), "GetYourExtra-File");
    assert.equal(sanitizeFilename("   "), "GetYourExtra-File");
  });

  test("sanitizeFilename truncates very long names", () => {
    const long = "A".repeat(300);
    const result = sanitizeFilename(long);
    assert.ok(result.length <= 80);
  });

  test("sanitizeFilename preserves hyphens and underscores", () => {
    assert.equal(sanitizeFilename("Smith_Residence-Renovation"), "Smith_Residence-Renovation");
  });
});
