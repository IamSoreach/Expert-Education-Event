import assert from "node:assert/strict";
import test from "node:test";

import { extractStartToken, extractTelegramCommand } from "./telegram";

test("extractStartToken handles deep-link start command", () => {
  assert.equal(extractStartToken("/start link_abc123"), "abc123");
});

test("extractStartToken handles /start without token", () => {
  assert.equal(extractStartToken("/start"), "");
});

test("extractStartToken ignores non-start commands", () => {
  assert.equal(extractStartToken("/help"), null);
});

test("extractTelegramCommand handles command with mention", () => {
  assert.equal(extractTelegramCommand("/checkin@EEVSC_bot"), "checkin");
});

test("extractTelegramCommand handles command with args", () => {
  assert.equal(extractTelegramCommand("/ticket 123"), "ticket");
});

test("extractTelegramCommand ignores plain text", () => {
  assert.equal(extractTelegramCommand("hello there"), null);
});
