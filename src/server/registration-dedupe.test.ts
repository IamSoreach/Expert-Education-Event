import assert from "node:assert/strict";
import test from "node:test";

import { buildParticipantDedupWhere } from "./registration-dedupe";

test("buildParticipantDedupWhere uses phone only when email missing", () => {
  const where = buildParticipantDedupWhere("+15550001", null);

  assert.deepEqual(where, { phoneNumber: "+15550001" });
});

test("buildParticipantDedupWhere uses phone or email when email exists", () => {
  const where = buildParticipantDedupWhere("+15550001", "user@example.com");

  assert.deepEqual(where, {
    OR: [{ phoneNumber: "+15550001" }, { email: "user@example.com" }],
  });
});
