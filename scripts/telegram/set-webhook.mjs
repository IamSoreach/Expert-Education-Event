const botToken = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const webhookUrl =
  process.env.TELEGRAM_WEBHOOK_URL ||
  `${(process.env.APP_BASE_URL || "").replace(/\/$/, "")}/api/telegram/webhook`;

if (!botToken) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

if (!secret) {
  throw new Error("Missing TELEGRAM_WEBHOOK_SECRET");
}

if (!webhookUrl.startsWith("https://")) {
  throw new Error(
    "Webhook URL must be HTTPS. Set TELEGRAM_WEBHOOK_URL or APP_BASE_URL accordingly.",
  );
}

const endpoint = `https://api.telegram.org/bot${botToken}/setWebhook`;

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: secret,
  }),
});

const payload = await response.json();
if (!response.ok || !payload.ok) {
  throw new Error(payload.description || "Failed to set Telegram webhook");
}

console.log("Webhook configured:", webhookUrl);
