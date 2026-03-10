# Post-Launch Improvements

## Security
- Add per-user staff accounts with role-based access.
- Add MFA for staff login.
- Move staff auth to hashed passwords in DB.
- Add persistent distributed rate limiting (Redis).

## Product
- Add admin panel for event/ticket management.
- Add ticket revoke/reissue UI.
- Add participant self-service ticket resend endpoint.
- Add Telegram Mini App workflow.

## Reliability
- Add background queue for Telegram sending retries.
- Add dead-letter handling for failed webhook updates.
- Add observability stack (structured logs + metrics + alerts).
- Add DB backup automation and restore drills.

## Testing
- Add integration tests for registration + linking + check-in flows.
- Add API contract tests for all public/staff routes.
- Add end-to-end browser tests for camera/manual scan UX.

## UX
- Improve confirmation page with live progress timeline.
- Add multilingual support for public and staff interfaces.
- Add offline-friendly check-in fallback mode.
