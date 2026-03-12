# Event Registration + QR Ticketing MVP

Single-codebase Next.js application for:
- public event registration
- Telegram deep-link account linking
- QR ticket generation + Telegram delivery
- browser-based staff check-in with duplicate protection and scan logs

## Tech Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma + MySQL
- Zod validation
- Internal Telegram API wrapper (no separate bot service)

## Project Structure
- `src/app` UI routes and API handlers
- `src/components` reusable UI components
- `src/lib` shared helpers (auth, logging, rate-limit, telegram, ticketing)
- `src/server` server-side domain modules
- `prisma` schema, migrations, and seed script
- `docs` planning and operations docs

## Core Routes
- `/` home
- `/register` redirect to configured default event
- `/register/[eventCode]` public registration form
- `/register/[eventCode]/confirmation` Telegram linking/ticket status page
- `/telegram/register` redirect to Telegram default event
- `/telegram/register/[eventCode]` Telegram Mini App registration route
- `/telegram/register/[eventCode]/confirmation` Telegram-oriented confirmation route
- `/telegram/check-in` redirect to Telegram ticket lookup for default event
- `/telegram/check-in/[eventCode]` Telegram Mini App phone lookup to send/re-send ticket
- `/staff/login` staff auth
- `/staff/dashboard` protected staff dashboard
- `/staff/check-in` protected camera/manual scanner
- `/api/health` health endpoint

## Environment Variables
Copy `.env.example` to `.env` and set all values.

Required groups:
- Database: `DATABASE_URL`
- App: `APP_BASE_URL`, `EVENT_NAME`, `EVENT_CODE`, `LOG_LEVEL`
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_LINK_TOKEN_TTL_MINUTES`, `TELEGRAM_WEBAPP_AUTH_MAX_AGE_SECONDS`
- Scanner: `SCANNER_BASE_URL`, `SCANNER_API_KEY`, `SCANNER_SOURCE`
- Security: `QR_SIGNING_SECRET`, `STAFF_PASSWORD`, `STAFF_AUTH_SECRET`
- Rate limit knobs: `RATE_LIMIT_*`

## Local Setup
```bash
npm install
npm run db:generate
```

## Database Migration
```bash
npm run db:migrate
# production:
# npm run db:deploy
```

## Seed Sample Event
```bash
npm run db:seed
```

The seed uses `EVENT_NAME` + `EVENT_CODE` from env.

## Run Locally
```bash
npm run dev
```

## Staff Login Setup
1. Set `STAFF_PASSWORD` to a strong value.
2. Set `STAFF_AUTH_SECRET` (random 16+ chars).
3. Open `/staff/login` and sign in.
4. Use `/staff/check-in` for camera or manual scans.

## Telegram Bot Setup
1. Create a bot with BotFather.
2. Save bot token to `TELEGRAM_BOT_TOKEN`.
3. Save bot username to `TELEGRAM_BOT_USERNAME`.
4. Set `TELEGRAM_WEBHOOK_SECRET` (random secret used in webhook header verification).
5. Set `TELEGRAM_WEBAPP_AUTH_MAX_AGE_SECONDS` (max age for Mini App auth payload).
6. Supported bot commands for users:
   - `/start link_<TOKEN>` for deep-link registration linking
   - `/checkin` (or `/ticket`) to open Mini App phone lookup and send ticket

## Telegram Mini App Setup
1. Set your menu button Web App URL to:
   - `https://<your-domain>/telegram/register/<eventCode>`
2. Keep the existing deep-link ticket flow enabled (`/start link_<TOKEN>` fallback remains active).
3. Optional: configure Mini App short name in BotFather for shareable `startapp` links.
4. See detailed setup in `docs/telegram-mini-app.md`.

Mini App behavior:
- Reuses the same registration UI and API as the web flow.
- Detects Telegram WebApp context client-side.
- Verifies Telegram `initData` server-side before trusting user context.
- Attempts automatic Telegram linking and immediate ticket send when verification succeeds.
- Falls back to existing confirmation/deep-link linking flow if verification or send fails.
- Also supports `/checkin` command flow:
  - Bot returns a WebApp button to `/telegram/check-in/<eventCode>`
  - User enters phone number
  - Server verifies Telegram `initData`, links account if needed, and sends/re-sends ticket in chat

## Webhook Setup
1. Ensure `APP_BASE_URL` is public HTTPS.
2. Optionally set `TELEGRAM_WEBHOOK_URL` explicitly.
3. Run:
```bash
npm run telegram:set-webhook
```
4. Verify:
```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## Deployment Steps (Generic Node Host)
1. Provision MySQL and set `DATABASE_URL`.
2. Set all environment variables.
3. Install dependencies: `npm install`.
4. Build: `npm run build`.
5. Run migrations: `npm run db:deploy`.
6. Start app: `npm run start`.
7. Register Telegram webhook.
8. Run smoke test: register -> Telegram link -> ticket delivery -> staff check-in -> duplicate scan.

## Hostinger-Oriented Notes
- Node runtime: use an LTS release supported by Next.js (Node 20+ recommended).
- Environment variables: set all from `.env.example` in Hostinger panel.
- Build command: `npm run build`
- Start command: `npm run start`
- Public base URL: set `APP_BASE_URL` to your production HTTPS domain.
- Webhook URL: use `TELEGRAM_WEBHOOK_URL` if webhook endpoint differs from `APP_BASE_URL/api/telegram/webhook`.
- Database connection: use Hostinger MySQL host/user/password/db in `DATABASE_URL`.
- After deploy: run `npm run db:deploy`, then `npm run telegram:set-webhook`.

## Security/Operations Notes
- Staff sessions use signed HttpOnly cookies.
- QR payloads are signed (`evtqr:v1:<ticketCode>.<signature>`).
- Core endpoints have in-memory rate limiting for MVP anti-abuse.
- All ticket scan attempts are written to `ScanLog`.

## QA Commands
```bash
npm run lint
npm run build
npm run test
```

## Additional Docs
- `docs/mvp-plan.md`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/telegram-mini-app.md`
- `docs/ops-checklist.md`
- `docs/post-launch-improvements.md`
