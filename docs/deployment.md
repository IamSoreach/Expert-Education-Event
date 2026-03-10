# Deployment Notes

## 1. Prerequisites
- Node.js 20+
- MySQL 8+
- Public HTTPS domain (required for Telegram webhook)

## 2. Environment Variables
Set all variables from `.env.example`.

Critical values:
- `DATABASE_URL`
- `APP_BASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_WEBAPP_AUTH_MAX_AGE_SECONDS`
- `QR_SIGNING_SECRET`
- `STAFF_PASSWORD`
- `STAFF_AUTH_SECRET`

## 3. Build + Migrate
```bash
npm install
npm run build
npm run db:deploy
```

## 4. Seed (optional in production)
```bash
npm run db:seed
```

## 5. Start Server
```bash
npm run start
```

## 6. Configure Telegram Webhook
```bash
npm run telegram:set-webhook
```

Verify:
```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## 7. Smoke Test
1. Register a participant from `/register/[eventCode]`.
2. Open Telegram deep link and press Start.
3. Verify ticket arrives in Telegram.
4. Staff login at `/staff/login`.
5. Scan ticket at `/staff/check-in`.
6. Re-scan to confirm duplicate blocking.

## 8. Telegram Mini App Smoke Test
1. Open `/telegram/register/[eventCode]` inside Telegram Mini App context.
2. Submit registration.
3. Confirm Telegram context is detected and confirmation page loads.
4. Confirm ticket is delivered automatically when Mini App verification succeeds.
5. Confirm fallback deep-link flow still works when auto-linking is not available.

## 9. Hostinger Checklist
- Build command: `npm run build`
- Start command: `npm run start`
- Install command: `npm install`
- Set `APP_BASE_URL` to your HTTPS production URL.
- If needed, set `TELEGRAM_WEBHOOK_URL` to explicit webhook endpoint.
- Set `DATABASE_URL` with Hostinger DB host/user/password/database.
- Run migrations after each deploy: `npm run db:deploy`.
- Set bot menu button Mini App URL to `/telegram/register/<eventCode>`.

## 10. Rollback Plan
- Redeploy last known-good build.
- Restore database backup if migration introduced data issues.
- Re-run webhook setup if domain/URL changed.

## 11. MVP Constraints
- Rate limiting is in-memory (single instance scope).
- Staff auth is password-only for MVP.
- Mini App integration depends on Telegram WebApp `initData` verification and available bot-user chat.
