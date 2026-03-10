import assert from "node:assert/strict";
import test from "node:test";

import { extractStartToken } from "./telegram";

test("extractStartToken handles deep-link start command", () => {
  assert.equal(extractStartToken("/start link_abc123"), "abc123");
});

test("extractStartToken handles /start without token", () => {
  assert.equal(extractStartToken("/start"), "");
});

test("extractStartToken ignores non-start commands", () => {
  assert.equal(extractStartToken("/help"), null);
});
