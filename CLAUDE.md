# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # local dev server (no webhook — use a Vercel preview deploy for end-to-end testing)
npm run build    # production build (runs tsc + Next.js compilation)
npm run lint     # ESLint
npx tsc --noEmit # type-check without emitting
```

There are no automated tests. End-to-end testing requires a live Telegram bot and a deployed URL — see the webhook section below.

## Architecture

This is a **serverless Telegram bot** built with Next.js App Router, deployed on Vercel. There is no UI; the only meaningful HTTP surface is the webhook route.

### Request flow

```
Telegram → POST /api/telegram/webhook
             ↓
         handleUpdate()          — routes message vs callback_query
             ↓
         advance() / startSession()
             ↓
         saveSession() / finish()  — Redis for state, Telegram API for output
```

- **`lib/questions.ts`** — single source of truth for all 12 Q&A steps (order, label, prompt, type, options). Add/reorder questions here only.
- **`lib/session.ts`** — Upstash Redis wrapper. Session shape: `{ step, answers, user }`. `step` is the index into `questions[]`. Sessions TTL at 1 hour.
- **`lib/telegram.ts`** — thin fetch wrapper around the Telegram Bot API. All outbound calls go through `telegramRequest()`, which throws on non-2xx. `escapeHtml()` must be applied to all user-supplied strings before inserting into HTML-mode messages.
- **`app/api/telegram/webhook/route.ts`** — the entire bot logic. Two update types handled: `message` (text) and `callback_query` (button tap).

### Session lifecycle

1. `/start` or `/restart` → `startSession()` writes a fresh session, sends greeting + Q0.
2. Each answer → `advance()` saves the updated session and sends the next question.
3. Final answer → `finish()`: `deleteSession` first (idempotency guard), then `sendToGroup` + user confirmation in parallel.
4. Stale sessions (missing `user` field from pre-schema migrations) are detected and cleaned up inline.

### Key invariants

- **`deleteSession` runs before `sendToGroup`** in `finish()`. This prevents duplicate group messages on Telegram webhook retries — if the session is already gone, the handler exits early.
- **All user-supplied text must pass through `escapeHtml()`** before being placed in any `parse_mode: 'HTML'` message body.
- **`session.user` may be `undefined`** in sessions stored before the `TelegramUser` field was added. Both handlers guard against this with `if (!session.user)`.

## Deployment

Requires four environment variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_GROUP_ID` (negative number for groups), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

After deploying, register the webhook once:
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<vercel-domain>/api/telegram/webhook"
```

Register bot commands once (run manually — there is no `/setup` route):
```bash
curl "https://api.telegram.org/bot<TOKEN>/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{"commands":[{"command":"start","description":"شروع ربات"},{"command":"restart","description":"راه‌اندازی مجدد و پاک کردن اطلاعات قبلی"}]}'
```

Diagnose a broken webhook:
```bash
curl -s "https://api.telegram.org/bot<TOKEN>/getWebhookInfo" | python3 -m json.tool
```
