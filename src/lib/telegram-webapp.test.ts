import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { verifyTelegramWebAppInitData } from "./telegram-webapp";

function signInitData(params: URLSearchParams, botToken: string): string {
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key !== "hash") {
      pairs.push(`${key}=${value}`);
    }
  }

  const dataCheckString = pairs.sort((a, b) => a.localeCompare(b)).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

test("verifyTelegramWebAppInitData returns parsed user for valid payload", () => {
  const botToken = "123456:telegram-token";
  const authDate = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams();
  params.set("auth_date", String(authDate));
  params.set("query_id", "AAHxexample");
  params.set(
    "user",
    JSON.stringify({
      id: 123456,
      first_name: "Mini",
      last_name: "User",
      username: "mini_user",
    }),
  );

  const initData = signInitData(params, botToken);
  const verified = verifyTelegramWebAppInitData(initData, botToken, 120);

  assert.ok(verified);
  assert.equal(verified?.user.id, 123456);
  assert.equal(verified?.user.first_name, "Mini");
});

test("verifyTelegramWebAppInitData rejects tampered payload", () => {
  const botToken = "123456:telegram-token";
  const authDate = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams();
  params.set("auth_date", String(authDate));
  params.set("user", JSON.stringify({ id: 123456, first_name: "Mini" }));

  const signed = signInitData(params, botToken);
  const tampered = `${signed}&extra=bad`;

  const verified = verifyTelegramWebAppInitData(tampered, botToken, 120);
  assert.equal(verified, null);
});
