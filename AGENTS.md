<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Artin Store SR Bot

A **Telegram Mini App** for a phone store, built with Next.js 16 App Router + React 19, deployed on Vercel. UI language is Persian (RTL, Vazirmatn font).

## Commands

```bash
npm run dev      # local dev server
npm run build    # production build (tsc + Next.js)
npm run lint     # ESLint (flat config, ESLint 9)
npx tsc --noEmit # type-check only
```

No automated tests. End-to-end testing requires a deployed Vercel URL — the Mini App only works inside Telegram.

## Architecture

Two HTTP surfaces:
- **`POST /api/telegram/webhook`** — handles `/start` + `/restart` only; sends a `web_app` button back
- **`POST /api/submit`** — validates `initData`, builds summary from `lib/questions.ts`, sends to Telegram group
- **`POST /api/apple-account`** — Apple ID purchase form; sends to `APPLE_ACCOUNT_HANDLER_ID` (not the group)
- **`POST /api/apple-support`** — sends user identity as a support request to `APPLE_ACCOUNT_HANDLER_ID`

### Key files

| File | Role |
|------|------|
| `lib/questions.ts` | Single source of truth for the 15 phone-form fields. Both the UI and the group summary derive from this array — add/remove/reorder only here. |
| `lib/telegram.ts` | Thin Telegram Bot API wrapper. `escapeHtml()` must wrap every user string before HTML insertion. |
| `lib/initData.ts` | `validateInitData` + `parseUser`. Empty `initData` → allowed; non-empty invalid → 401. |
| `app/page.tsx` | `'use client'` UI — five tabs: `form`, `calc`, `inventory`, `apple`, `contact`. All styles in a bottom `s: CSSProperties` object. |
| `app/globals.css` | Maps `--tg-theme-*` CSS vars to short locals (`--bg`, `--btn`, etc.). Three-layer dark theme. |
| `app/layout.tsx` | `lang="fa" dir="rtl"`. Loads Telegram WebApp SDK via sync `<script>` (eslint-disable comment is intentional). |

## Key Invariants

- **`escapeHtml()` on all user text** before any `parse_mode: 'HTML'` Telegram message.
- **`initData` dual-mode auth**: empty = allowed (browser testing); non-empty invalid = 401. Never remove the non-empty check.
- **Questions are the single source of truth.** Modifying `lib/questions.ts` automatically updates the form UI and the group summary.
- **iOS zoom fix:** `font-size: 16px` is forced on all inputs in `globals.css`. Never set input font sizes below 16px.
- **DM button**: attached only when `user.username` exists. Users without a username get a `tg://user?id=…` mention link instead.
- **Installment calculator** (in `page.tsx`): min down-payment = 40%, financing fee = 5% of remainder, amounts rounded to nearest 10,000 (`round5`), cheque mode only for even month counts.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot auth token |
| `TELEGRAM_GROUP_ID` | Negative number for the group |
| `NEXT_PUBLIC_WEBAPP_URL` | Vercel deployment URL shown in the `web_app` button |
| `APPLE_ACCOUNT_HANDLER_ID` | Telegram user/chat ID for apple-account + apple-support messages |

## Known Issues / Pitfalls

- **`PERSIAN_MONTHS` is duplicated** in `app/page.tsx` and `app/api/apple-account/route.ts` — extract to a shared lib before adding a third usage.
- **No rate limiting** on any API route — empty `initData` always passes auth; don't add direct DB writes without protection.
- **`closeTimerRef` is shared** across form and apple tabs — clearing it in one success handler affects the other.
- **`public/apple-account-terms.m4a`** must exist for the audio element in the apple tab to work.
