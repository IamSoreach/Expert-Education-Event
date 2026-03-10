import assert from "node:assert/strict";
import test from "node:test";

import { getImmediateScanResult } from "./checkin-logic";

test("getImmediateScanResult returns REVOKED first", () => {
  assert.equal(
    getImmediateScanResult({ revokedAt: new Date(), checkedInAt: null }),
    "REVOKED",
  );
});

test("getImmediateScanResult returns DUPLICATE when already checked in", () => {
  assert.equal(
    getImmediateScanResult({ revokedAt: null, checkedInAt: new Date() }),
    "DUPLICATE",
  );
});

test("getImmediateScanResult returns CANDIDATE_VALID for fresh ticket", () => {
  assert.equal(
    getImmediateScanResult({ revokedAt: null, checkedInAt: null }),
    "CANDIDATE_VALID",
  );
});
