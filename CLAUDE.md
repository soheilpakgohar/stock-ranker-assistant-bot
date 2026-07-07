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

This is a **Telegram Mini App** built with Next.js App Router, deployed on Vercel. It has four HTTP surfaces:

1. **`POST /api/telegram/webhook`** — receives Telegram updates; only handles `/start` and `/restart`, both of which reply with a single `web_app` inline keyboard button that opens the Mini App.
2. **`POST /api/submit`** — receives form data from the Mini App, validates Telegram `initData` (HMAC-SHA256), and sends the formatted summary to the group.
3. **`POST /api/apple-account`** — receives an Apple ID purchase form (name, Jalali birthdate, email), validates fields server-side, and sends to `APPLE_ACCOUNT_HANDLER_ID`.
4. **`POST /api/apple-support`** — sends the user's identity as a support request to `APPLE_ACCOUNT_HANDLER_ID`.

### Request flow

```
User taps /start in Telegram
  → webhook sends web_app button pointing to NEXT_PUBLIC_WEBAPP_URL
  → user opens Mini App (app/page.tsx) inside Telegram
  → fills phone form → POST /api/submit { answers, initData }
  → submit route validates initData, calls sendToGroup()
  → group receives summary + optional DM button
  → Mini App shows success screen with option to submit again
```

### Files

- **`lib/questions.ts`** — single source of truth for all 15 phone-form fields (order, label, prompt, type, options). The Mini App form and the group summary both derive from this array.
- **`lib/telegram.ts`** — thin fetch wrapper around the Telegram Bot API. `escapeHtml()` must be applied to all user-supplied strings in HTML-mode messages. `sendToGroup()` accepts an optional `InlineKeyboardMarkup` for the DM button.
- **`app/page.tsx`** — `'use client'` Mini App UI: five-tab layout (phone form, installment calculator, inventory placeholder, apple ID purchase, contact). Calls `window.Telegram.WebApp.expand()` / `ready()` on mount and sets `data-theme="dark"` on `<html>` when `colorScheme === 'dark'`.
- **`app/api/submit/route.ts`** — validates `initData` with HMAC-SHA256 (`WebAppData` key), parses `user` from `initData`, builds and sends the group summary. Empty `initData` is allowed (user info will be absent from the message); only non-empty but invalid `initData` is rejected with 401.
- **`app/globals.css`** — maps Telegram theme CSS variables (`--tg-theme-*`) to short local vars (`--bg`, `--btn`, etc.). Includes `@media (prefers-color-scheme: dark)` fallbacks and a `[data-theme="dark"]` rule for when Telegram is dark but the OS is light.

### Key invariants

- **`escapeHtml()` on all user text** before inserting into any `parse_mode: 'HTML'` message.
- **`initData` validation:** empty `initData` passes (browser access with no user info); non-empty invalid `initData` returns 401. Do not remove the non-empty check.
- **Questions are the single source of truth.** Add, remove, or reorder only in `lib/questions.ts`; the form and summary update automatically.
- **iOS zoom fix:** all inputs are forced to `font-size: 16px` in `globals.css`. Do not set input font sizes below 16px — iOS Safari zooms the viewport on focus for smaller inputs.
- **DM button:** `sendToGroup()` attaches a `💬 ارسال پیام به فروشنده` URL button only when the submitting user has a Telegram username. Users without a username still appear as a `tg://user?id=…` mention link in the message text.

## Deployment

Requires four environment variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_GROUP_ID` (negative number for groups), `NEXT_PUBLIC_WEBAPP_URL` (the Vercel deployment URL), and `APPLE_ACCOUNT_HANDLER_ID` (Telegram user/chat ID that receives apple-account and apple-support messages).

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
