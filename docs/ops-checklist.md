# Launch Day Ops Checklist

## Before Opening Registration
- [ ] Production env vars are set and validated.
- [ ] `npm run db:deploy` completed successfully.
- [ ] `npm run telegram:set-webhook` executed against production URL.
- [ ] `/api/health` returns `status: ok`.
- [ ] Staff password shared securely with event operators.

## Functional Smoke Test
- [ ] Register one participant via `/register/[eventCode]`.
- [ ] Register one participant via `/telegram/register/[eventCode]` inside Telegram.
- [ ] Telegram deep link opens bot and links successfully.
- [ ] QR ticket arrives in Telegram chat.
- [ ] Staff login works.
- [ ] Valid scan returns `VALID`.
- [ ] Immediate re-scan returns `DUPLICATE`.
- [ ] Invalid random code returns `INVALID` and appears in logs.

## Runtime Monitoring During Event
- [ ] Watch server logs for `error` entries.
- [ ] Watch DB for growing `ScanLog` volume.
- [ ] Confirm webhook updates continue arriving.
- [ ] Confirm check-in page camera access works on staff devices.

## Incident Quick Actions
- [ ] Telegram delivery issues: verify bot token + webhook status.
- [ ] DB issues: verify database connectivity and migration state.
- [ ] High abuse traffic: lower rate-limit thresholds via env.
- [ ] Staff lockout: rotate `STAFF_PASSWORD` and restart app.

## Post Event
- [ ] Export registrations and scan logs.
- [ ] Rotate secrets used for test/demo environments.
- [ ] Capture incident notes and backlog improvements.
