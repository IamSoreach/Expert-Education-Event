# Architecture

## Principles
- One deployable app and one codebase.
- Frontend and backend in the same Next.js project.
- Pragmatic, typed modules with clear boundaries.

## Runtime model
- `src/app/*`: UI pages and API route handlers.
- `src/lib/*`: shared domain logic and helpers.
- `src/server/*`: server module entry points for internal integrations.
- `prisma/*`: schema and migrations for MySQL access.

## Integration decisions
- Telegram integration is implemented as internal server modules.
- Registration UI supports both web route (`/register/[eventCode]`) and Mini App route (`/telegram/register/[eventCode]`).
- Staff check-in is a protected web page (`/staff/check-in`).
- Data access flows through Prisma client only.
- Input validation uses Zod in API routes.
- API routes use structured server logging.
- MVP anti-abuse uses in-memory per-endpoint rate limits.

## Data flow
1. Participant submits registration data to API.
2. API validates input (Zod), stores data (Prisma).
3. Telegram bot webhook links account and triggers ticket flow.
4. Staff scanner posts QR payload to protected API.
5. API validates, checks duplicate status, and logs every attempt.
