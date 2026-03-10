# Dev Rules

1. Keep changes small, typed, and easy to review.
2. Validate all external input using Zod.
3. Access the database only through Prisma.
4. Keep server logic in `src/lib` or `src/server`, not inside UI components.
5. Use environment variables for secrets and runtime configuration.
6. Prefer simple solutions over abstraction-heavy patterns.
7. Maintain one codebase and avoid microservice splits for MVP.
8. Run lint and build before merging.
9. Log server-side failures with structured logs, never secrets.
10. Keep anti-abuse controls (rate limits, auth checks) enabled in production.
