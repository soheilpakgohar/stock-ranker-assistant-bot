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

HTTP surfaces:
- **`POST /api/telegram/webhook`** — handles `/start` + `/restart` only; sends a `web_app` button back
- **`POST /api/submit`** — validates `initData`, builds summary from `lib/questions.ts`, sends to Telegram group
- **`POST /api/apple-account`** — Apple ID purchase form; sends to `APPLE_ACCOUNT_HANDLER_ID` (not the group)
- **`POST /api/apple-support`** — sends user identity as a support request to `APPLE_ACCOUNT_HANDLER_ID`
- **`GET /api/devices`** — transparent proxy to the external devices API (list). No `initData` auth (public catalog). Attaches the bearer token server-side via `lib/devices.ts`.
- **`GET /api/devices/[id]`** — transparent proxy for a single device's details. Sanitizes `id` (`/^[A-Za-z0-9_-]+$/`). Prefixes relative `photos` paths with `DEVICES_API_BASE_URL` server-side. **Next.js 16: `params` is a Promise — must be awaited.**
- **`POST /api/order`** — validates `initData`, sends a brief device summary + submitter identity to the group as a "🛒 سفارش" message. Mirrors the `/api/submit` pattern (DM button when username exists).

### Key files

| File | Role |
|------|------|
| `lib/questions.ts` | Single source of truth for the 15 phone-form fields. Both the UI and the group summary derive from this array — add/remove/reorder only here. |
| `lib/telegram.ts` | Thin Telegram Bot API wrapper. `escapeHtml()` must wrap every user string before HTML insertion. |
| `lib/initData.ts` | `validateInitData` + `parseUser`. Empty `initData` → allowed; non-empty invalid → 401. |
| `lib/devices.ts` | Server-side fetch helpers (`fetchDevices`, `fetchDevice`) for the external devices API — attach the bearer token, prefix relative photo URLs with `DEVICES_API_BASE_URL`. Also exports client-side normalizers (`normalizeList`, `normalizeDetail`) that defensively coerce the unknown upstream JSON into typed `DeviceListItem` / `DeviceDetails`. The upstream field names are unknown, so normalizers check many aliases (`model_name` → `name`, `photos` → `images`, `explanation` → `description`, etc.) and fold flat fields into labeled `specs` rows. |
| `app/page.tsx` | `'use client'` UI — five tabs: `form`, `calc`, `inventory`, `apple`, `contact`. All styles in a bottom `s: CSSProperties` object. Inventory tab fetches `/api/devices` on first open, renders a device list with skeleton/error/empty states, and opens a `DeviceSheet` bottom sheet (spring drag-to-dismiss) with a `PhotoGallery` (swipeable) + `PhotoViewer` (fullscreen). Uses the `motion` library for springs/drag/`AnimatePresence`. |
| `app/globals.css` | Maps `--tg-theme-*` CSS vars to short locals (`--bg`, `--btn`, etc.). Three-layer dark theme. |
| `app/layout.tsx` | `lang="fa" dir="rtl"`. Loads Telegram WebApp SDK via sync `<script>` (eslint-disable comment is intentional). Also loads Font Awesome 6.5.2 via CDN `<link>` (no SRI — `crossOrigin` + `referrerPolicy` only). |

## Key Invariants

- **`escapeHtml()` on all user text** before any `parse_mode: 'HTML'` Telegram message.
- **`initData` dual-mode auth**: empty = allowed (browser testing); non-empty invalid = 401. Never remove the non-empty check.
- **Questions are the single source of truth.** Modifying `lib/questions.ts` automatically updates the form UI and the group summary.
- **iOS zoom fix:** `font-size: 16px` is forced on all inputs in `globals.css`. Never set input font sizes below 16px.
- **DM button**: attached only when `user.username` exists. Users without a username get a `tg://user?id=…` mention link instead.
- **Installment calculator** (in `page.tsx`): min down-payment = 40%, financing fee = 5% of remainder, amounts rounded to nearest 10,000 (`round5`), cheque mode only for even month counts.
- **Devices API bearer token is server-side only.** `DEVICES_API_TOKEN` never reaches the client — the Mini App calls our own `/api/devices` proxy routes, which attach the `Authorization` header in `lib/devices.ts`. Never expose the token in client code or `NEXT_PUBLIC_*` vars.
- **`DEVICES_API_BASE_URL` has no hardcoded default.** `localhost:8000` is dev-only (set in `.env.local`); production must point at a publicly reachable host (Vercel can't reach localhost).
- **Device detail cache** (in `page.tsx`): `detailCache` is an in-memory `Record<string, DeviceDetails>` keyed by `String(device.id)`. Each device is fetched only once; re-opening shows details instantly. Clears on page reload (no localStorage persistence).
- **Inventory fetch effect**: `invLoading` is intentionally excluded from the `useEffect` dependency array — including it causes a stale-closure cleanup race that silently discards the fetch result. The `cancelled` flag + `invFetched` guard handle re-entry.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot auth token |
| `TELEGRAM_GROUP_ID` | Negative number for the group |
| `NEXT_PUBLIC_WEBAPP_URL` | Vercel deployment URL shown in the `web_app` button |
| `APPLE_ACCOUNT_HANDLER_ID` | Telegram user/chat ID for apple-account + apple-support messages |
| `DEVICES_API_BASE_URL` | Base URL of the external devices/inventory API (required, no default). Dev: `http://localhost:8000`; prod: public host. |
| `DEVICES_API_TOKEN` | Static bearer token for the devices API (server-side only, never prefixed `NEXT_PUBLIC_`). |

## Known Issues / Pitfalls

- **`PERSIAN_MONTHS` is duplicated** in `app/page.tsx` and `app/api/apple-account/route.ts` — extract to a shared lib before adding a third usage.
- **No rate limiting** on any API route — empty `initData` always passes auth; don't add direct DB writes without protection.
- **`closeTimerRef` is shared** across form and apple tabs — clearing it in one success handler affects the other.
- **`public/apple-account-terms.m4a`** must exist for the audio element in the apple tab to work.
- **`<img>` warnings are intentional** for device photos — images come from an external API with dynamic/unpredictable URLs, so `next/image` domain whitelisting isn't practical. Lint flags these as `@next/next/no-img-element`; they are safe to ignore.
- **Device photos need `DEVICES_API_BASE_URL`** — the upstream API returns relative paths (`/storage/devices/…`). `fetchDevice()` in `lib/devices.ts` prefixes them server-side; if photos don't load, check that `DEVICES_API_BASE_URL` is correct and the API host serves images publicly.
