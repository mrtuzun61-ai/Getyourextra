import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  formatChangeOrderNumber,
  baseChangeOrderNumber,
  nextRevisionNumber,
  isRevisionNumber,
} from "../coNumber.ts";

describe("change order numbering", () => {
  test("formatChangeOrderNumber zero-pads to 4 digits", () => {
    assert.equal(formatChangeOrderNumber(1), "CO-0001");
    assert.equal(formatChangeOrderNumber(42), "CO-0042");
    assert.equal(formatChangeOrderNumber(10000), "CO-10000");
  });

  test("formatChangeOrderNumber rejects invalid sequence numbers", () => {
    assert.throws(() => formatChangeOrderNumber(0));
    assert.throws(() => formatChangeOrderNumber(-1));
    assert.throws(() => formatChangeOrderNumber(NaN));
  });

  test("never produces a duplicate for sequential increments", () => {
    const seen = new Set<string>();
    for (let i = 1; i <= 500; i++) {
      const n = formatChangeOrderNumber(i);
      assert.ok(!seen.has(n), `duplicate number generated: ${n}`);
      seen.add(n);
    }
  });

  test("baseChangeOrderNumber strips revision suffix", () => {
    assert.equal(baseChangeOrderNumber("CO-0018"), "CO-0018");
    assert.equal(baseChangeOrderNumber("CO-0018-R1"), "CO-0018");
    assert.equal(baseChangeOrderNumber("CO-0018-R12"), "CO-0018");
  });

  test("nextRevisionNumber increments correctly from the original", () => {
    assert.equal(nextRevisionNumber("CO-0018", 0), "CO-0018-R1");
    assert.equal(nextRevisionNumber("CO-0018", 1), "CO-0018-R2");
  });

  test("nextRevisionNumber works even if given an already-revised number", () => {
    assert.equal(nextRevisionNumber("CO-0018-R1", 1), "CO-0018-R2");
  });

  test("nextRevisionNumber rejects negative counts", () => {
    assert.throws(() => nextRevisionNumber("CO-0018", -1));
  });

  test("isRevisionNumber detects revisions correctly", () => {
    assert.equal(isRevisionNumber("CO-0018"), false);
    assert.equal(isRevisionNumber("CO-0018-R1"), true);
    assert.equal(isRevisionNumber("CO-0018-R12"), true);
  });
});
