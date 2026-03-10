import assert from "node:assert/strict";
import test from "node:test";

import { normalizeRawTicketCode } from "./ticket-code";

test("normalizeRawTicketCode uppercases valid code", () => {
  assert.equal(normalizeRawTicketCode("ab12cd34ef56"), "AB12CD34EF56");
});

test("normalizeRawTicketCode rejects short value", () => {
  assert.equal(normalizeRawTicketCode("abc123"), null);
});

test("normalizeRawTicketCode rejects symbols", () => {
  assert.equal(normalizeRawTicketCode("ABCD-1234-!@#$"), null);
});
