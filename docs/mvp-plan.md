# MVP Plan

## Goal
Ship a fast, practical MVP for event registration and QR ticketing in a single Next.js app.

## Scope for scaffold phase
1. App foundation and tooling (Next.js, TypeScript, Tailwind, ESLint, Prisma).
2. Core folder structure and base docs.
3. Placeholder routes for participant and staff journeys.
4. Health endpoint and env template.

## Immediate implementation phases
1. Public registration flow with input validation using Zod.
2. Telegram deep-link linking and webhook processing.
3. Ticket generation and Telegram delivery.
4. Staff check-in flow with duplicate protection and scan logging.

## Deferred items
- Role-based access control
- Multi-event administration
- Reporting dashboards
- Telegram Mini App UX
