# Telegram Mini App Setup

## Goal
Run the same registration form inside Telegram while preserving the public web flow.

## Mini App Route
Use:
- `/telegram/register/[eventCode]`

For a single default event:
- `/telegram/register` (redirects to `EVENT_CODE`)

## BotFather Configuration
1. Open BotFather and select your bot.
2. Configure the menu button as a Web App URL pointing to:
   - `https://<your-domain>/telegram/register/<eventCode>`
3. (Optional) Configure a Mini App short name for shareable deep links.

## Deep Link Notes
- Existing ticket-link flow stays unchanged:
  - `https://t.me/<BOT_USERNAME>?start=link_<TOKEN>`
- If you configure a Mini App short name, Telegram provides a `startapp`-style deep link for opening the Mini App directly.

## Server-Side Verification
- The registration API accepts optional `telegramWebAppInitData`.
- The server verifies Telegram WebApp `initData` signature using bot token.
- Verification timeout is controlled by:
  - `TELEGRAM_WEBAPP_AUTH_MAX_AGE_SECONDS`

## What Happens In Mini App Mode
1. Form detects Telegram WebApp context client-side.
2. Form sends `telegramWebAppInitData` with registration submit.
3. Server verifies it and attempts to link Telegram user to participant.
4. If linked, server attempts immediate ticket send in Telegram.
5. If verification or auto-send fails, existing confirmation page/deep-link fallback still works.

## Limitations / Permissions
- WebApp context is only available inside Telegram clients.
- Telegram WebApp user context does not include phone/email automatically.
- Bot can send ticket only if bot-user chat is available (user has started the bot).
- Mini App auto-link uses in-memory app state + current DB constraints (no external queue/session store).
