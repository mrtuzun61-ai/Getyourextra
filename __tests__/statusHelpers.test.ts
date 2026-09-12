import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isTerminalStatus,
  isApprovedOrPaid,
  isBlockedStatusTransition,
  wouldChangeApprovedPricing,
} from "../statusHelpers.ts";

describe("status helpers", () => {
  test("isTerminalStatus flags paid and declined only", () => {
    assert.equal(isTerminalStatus("paid"), true);
    assert.equal(isTerminalStatus("declined"), true);
    assert.equal(isTerminalStatus("draft"), false);
    assert.equal(isTerminalStatus("sent"), false);
    assert.equal(isTerminalStatus("approved"), false);
  });

  test("isApprovedOrPaid", () => {
    assert.equal(isApprovedOrPaid("approved"), true);
    assert.equal(isApprovedOrPaid("paid"), true);
    assert.equal(isApprovedOrPaid("draft"), false);
    assert.equal(isApprovedOrPaid("sent"), false);
  });

  test("isBlockedStatusTransition prevents moving out of paid", () => {
    assert.equal(isBlockedStatusTransition("paid", "approved"), true);
    assert.equal(isBlockedStatusTransition("paid", "paid"), false);
  });

  test("isBlockedStatusTransition prevents moving out of declined", () => {
    assert.equal(isBlockedStatusTransition("declined", "sent"), true);
  });

  test("isBlockedStatusTransition allows practical manual correction", () => {
    assert.equal(isBlockedStatusTransition("draft", "approved"), false); // signed in person
    assert.equal(isBlockedStatusTransition("sent", "approved"), false);
    assert.equal(isBlockedStatusTransition("approved", "paid"), false);
  });

  const existing = {
    description: "Add 6 outlets",
    markupType: "percent",
    markupValue: 1500,
    taxEnabled: false,
    taxPercentBasisPoints: 0,
    discountCents: 0,
  };

  test("wouldChangeApprovedPricing is false for a draft (nothing to protect yet)", () => {
    assert.equal(wouldChangeApprovedPricing("draft", existing, { description: "changed" }), false);
  });

  test("wouldChangeApprovedPricing is true when an approved CO's description changes", () => {
    assert.equal(wouldChangeApprovedPricing("approved", existing, { description: "different scope" }), true);
  });

  test("wouldChangeApprovedPricing is true when line items change on an approved CO", () => {
    assert.equal(wouldChangeApprovedPricing("approved", existing, { lineItemsChanged: true }), true);
  });

  test("wouldChangeApprovedPricing is true when markup changes on a paid CO", () => {
    assert.equal(wouldChangeApprovedPricing("paid", existing, { markupValue: 2000 }), true);
  });

  test("wouldChangeApprovedPricing is false when nothing pricing-relevant changes", () => {
    assert.equal(wouldChangeApprovedPricing("approved", existing, {}), false);
  });

  test("wouldChangeApprovedPricing is false when values are resubmitted unchanged", () => {
    assert.equal(
      wouldChangeApprovedPricing("approved", existing, {
        description: existing.description,
        markupValue: existing.markupValue,
      }),
      false
    );
  });
});
