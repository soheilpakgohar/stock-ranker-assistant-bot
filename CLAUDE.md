# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # local dev server
npm run build    # production build (runs tsc + Next.js compilation)
npm run lint     # ESLint
npx tsc --noEmit # type-check without emitting
```

There are no automated tests. End-to-end testing requires a deployed Vercel URL — the Mini App only works inside Telegram.

## Architecture

This is a **Telegram Mini App** built with Next.js App Router, deployed on Vercel. It has two HTTP surfaces:

1. **`POST /api/telegram/webhook`** — receives Telegram updates; only handles `/start` and `/restart`, both of which reply with a single `web_app` inline keyboard button that opens the Mini App.
2. **`POST /api/submit`** — receives form data from the Mini App, validates Telegram `initData` (HMAC-SHA256), and sends the formatted summary to the group.

### Request flow

```
User taps /start in Telegram
  → webhook sends web_app button pointing to NEXT_PUBLIC_WEBAPP_URL
  → user opens Mini App (app/page.tsx) inside Telegram
  → fills phone form → POST /api/submit { answers, initData }
  → submit route validates initData, calls sendToGroup()
  → Mini App shows success and closes
```

### Files

- **`lib/questions.ts`** — single source of truth for all 12 form fields (order, label, prompt, type, options). The Mini App form and the group summary both derive from this array.
- **`lib/telegram.ts`** — thin fetch wrapper around the Telegram Bot API. `escapeHtml()` must be applied to all user-supplied strings in HTML-mode messages.
- **`app/page.tsx`** — `'use client'` Mini App UI: three-tab layout (phone form, installment calculator, contact). Calls `window.Telegram.WebApp.expand()` / `ready()` on mount.
- **`app/api/submit/route.ts`** — validates `initData` with HMAC-SHA256 (`WebAppData` key), parses `user` from `initData`, builds and sends the group summary. In `development` mode, empty `initData` bypasses validation so you can test via browser.
- **`app/globals.css`** — maps Telegram theme CSS variables (`--tg-theme-*`) to short local vars (`--bg`, `--btn`, etc.) consumed throughout `page.tsx`.

### Key invariants

- **`escapeHtml()` on all user text** before inserting into any `parse_mode: 'HTML'` message.
- **`initData` validation is mandatory in production.** Do not disable it outside `NODE_ENV === 'development'`.
- **Questions are the single source of truth.** Add, remove, or reorder only in `lib/questions.ts`; the form and summary update automatically.

## Deployment

Requires three environment variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_GROUP_ID` (negative number for groups), `NEXT_PUBLIC_WEBAPP_URL` (the Vercel deployment URL).

After deploying, register the webhook once:
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<vercel-domain>/api/telegram/webhook"
```

Register bot commands once:
```bash
curl "https://api.telegram.org/bot<TOKEN>/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{"commands":[{"command":"start","description":"شروع ربات"},{"command":"restart","description":"راه‌اندازی مجدد"}]}'
```

Diagnose a broken webhook:
```bash
curl -s "https://api.telegram.org/bot<TOKEN>/getWebhookInfo" | python3 -m json.tool
```
