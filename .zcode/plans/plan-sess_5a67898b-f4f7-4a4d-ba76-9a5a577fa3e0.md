# Plan: Replace in-app emojis with Font Awesome (free, CDN)

## Decision
Load Font Awesome via a **CDN `<link>`** in `app/layout.tsx` (matches the existing Vazirmatn-font pattern). Render icons with `<i className="fa-solid fa-…">` / `<i className="fa-brands fa-…">`.

## What changes (only the Mini App UI — `app/page.tsx`)

### 1. `app/layout.tsx` — add one `<link>` in `<head>`
```
<link rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
  integrity="sha512-..." crossOrigin="anonymous" referrerPolicy="no-referrer" />
```
(Plain href without integrity is also fine if the hash is hard to pin — I'll include integrity for the pinned 6.5.2 version.)

### 2. Tab bar — keep the `[Tab, string, string][]` shape, store the FA **class** as the middle string
Icon currently rendered as `<span style={{fontSize:'22px'}}>{icon}</span>` → change to `<i className={icon} style={{fontSize:'22px', lineHeight:1}} />`. The button's existing `color` (active=`var(--btn)`, else=`var(--hint)`) is inherited via `currentColor`, so active/inactive coloring still works.

| Tab | Old emoji | New FA class |
|-----|-----------|--------------|
| ثبت دستگاه | 📱 | `fa-solid fa-mobile-screen` |
| اقساط | 💳 | `fa-solid fa-credit-card` |
| موجودی | 🛍️ | `fa-solid fa-bag-shopping` |
| تماس | 📍 | `fa-solid fa-location-dot` |
| اپل | 🍎 | `fa-brands fa-apple` |

### 3. Large success / placeholder screens (standalone `<div fontSize:52-56px>`)
Replace the emoji text node with an `<i className=… style={{fontSize:…, color:…}} />`:

| Location | Old | New FA class | Color |
|----------|-----|--------------|-------|
| Form success (✅) | `fa-solid fa-circle-check` | `#22c55e` (green, preserves "success") |
| Inventory placeholder (🛍️) | `fa-solid fa-bag-shopping` | `var(--hint)` |
| Apple success (🍏) | `fa-brands fa-apple` | `var(--text)` |

### 4. Section header — Apple `<h1>` (`🍎 ساخت حساب…`)
Put `<i className="fa-brands fa-apple" style={{marginLeft:'6px'}} />` before the text (RTL → margin-left for spacing).

### 5. Button icons — contact tab outline buttons + support button
The `🗺`/`🌐` buttons use `s.outlineBtn` (`display:block`). To place an icon next to text, override to `display:flex; alignItems:center; justifyContent:center; gap:6px` (same pattern the 🎧 support button already uses), then render `<i className=… /> <span>label</span>`.

| Button | Old | New FA class |
|--------|-----|--------------|
| باز کردن در گوگل‌مپ | 🗺 | `fa-solid fa-map-location-dot` |
| وبسایت فروشگاه | 🌐 | `fa-solid fa-globe` |
| نیاز به پشتیبانی دارم | 🎧 | `fa-solid fa-headset` |

### 6. Inline checkmarks
- "پخش کامل شد ✓" → `پخش کامل شد <i className="fa-solid fa-check" />` (in the accent-colored line that's already `var(--btn)`).
- ResultRow "کپی شد ✓" → `کپی شد <i className="fa-solid fa-check" />`.

### 7. `alert()` string (`✅ درخواست پشتیبانی…`)
Native browser alert — **can't render a web font**. Keep the emoji as-is (or drop it). No change.

## What stays unchanged (cannot use web fonts)
All emojis **inside Telegram messages** (API routes) stay as Unicode emoji — they render on the recipient's Telegram client, not in our web view:
- `app/api/submit/route.ts` — `📋 ▫️ 🔗 👤 💬`
- `app/api/apple-account/route.ts` — `🍏 ▫️ 🔗 👤 💬`
- `app/api/apple-support/route.ts` — `🎧 🔗 👤 💬`
- `app/api/telegram/webhook/route.ts` — `👋 📱`

## Not touched
- `lib/questions.ts` prompt emojis — already invisible (UI uses `q.label`, and `extractPlaceholder` strips them). No change.
- `app/globals.css` — no change (icons are self-contained via the CDN CSS).
- Leftover `/public/*.svg` starter assets — leave as-is (out of scope).

## Verification
- `npx tsc --noEmit` + `npm run build` must pass (icons are just strings/className; no type changes to the tab tuple).
- Visual: open the Mini App → confirm all 5 tab icons, success screens, Apple header, contact buttons, support button, and checkmarks render as crisp Font Awesome icons and inherit the theme colors.