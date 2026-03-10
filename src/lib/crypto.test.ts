import assert from "node:assert/strict";
import test from "node:test";

import { createSignedQrPayload, parseSignedQrPayload } from "./crypto";

test("parseSignedQrPayload validates and extracts ticket code", () => {
  const secret = "0123456789abcdef";
  const payload = createSignedQrPayload("ABCD1234EFGH", secret);

  const parsed = parseSignedQrPayload(payload, secret);

  assert.deepEqual(parsed, { ticketCode: "ABCD1234EFGH" });
});

test("parseSignedQrPayload rejects tampered payload", () => {
  const secret = "0123456789abcdef";
  const payload = createSignedQrPayload("ABCD1234EFGH", secret);
  const tampered = payload.replace("ABCD1234EFGH", "ZXCV1234QWER");

  const parsed = parseSignedQrPayload(tampered, secret);

  assert.equal(parsed, null);
});
