# Plan: Inventory tab — device list + spring bottom sheet + order + detail cache

Fetch devices from an external API, display them as a sleek list, reveal details in a drag-to-dismiss spring bottom sheet (per `apple-design` skill), and let the user place an order that sends brief device info + their username to the group. Details are cached client-side so each device is fetched only once. The bearer token is a **server-side secret** — the client never sees it.

## Architecture

```
Client (page.tsx)              Our API routes (server)             External API
  GET  /api/devices       ──►  app/api/devices/route.ts      ──►  GET  {BASE}/api/devices
  GET  /api/devices/:id   ──►  app/api/devices/[id]/route    ──►  GET  {BASE}/api/devices/:id
                               ↑ attaches Authorization: Bearer ${DEVICES_API_TOKEN}
  POST /api/order         ──►  app/api/order/route.ts        ──►  sendToGroup() (Telegram)
```

- `{BASE}` = `DEVICES_API_BASE_URL` — a **required env var with no hardcoded default**. `localhost:8000` is dev-only and set by the developer in `.env.local`; production points at a public host. The code never assumes port 8000.
- The two proxy GET routes are **transparent** — they pass upstream JSON through unchanged, so we don't hard-couple to an unknown response contract. The client normalizes defensively (render any known field if present, skip if absent).
- The order route follows the exact `submit/route.ts` pattern: validate `initData`, `parseUser`, build an HTML summary, `sendToGroup` with a DM button when the user has a username.

## Files

### 1. NEW `lib/devices.ts` — types + server fetch helpers
Mirrors the `lib/telegram.ts` wrapper pattern (read env, check `res.ok`, throw descriptive error).

```ts
export type DeviceListItem = {
  id: string | number;
  name: string;
  price?: number | string;
  image?: string; image_url?: string; thumbnail?: string; photo?: string;
  brand?: string; model?: string; in_stock?: boolean;
  [key: string]: unknown;
};
export type DeviceDetails = DeviceListItem & {
  description?: string;
  specs?: Record<string, string> | Array<{ label?: string; value?: string; key?: string }>;
  storage?: string; color?: string; condition?: string; warranty?: string;
  images?: string[];
  [key: string]: unknown;
};

// Reads DEVICES_API_BASE_URL (required, no default) + DEVICES_API_TOKEN (required).
// Throws if either is unset. Returns parsed JSON.
export async function fetchDevices(): Promise<unknown>
export async function fetchDevice(id: string): Promise<unknown>

// Client-side normalizers: coerce unknown upstream payload → typed shapes.
export function normalizeList(raw: unknown): DeviceListItem[]
export function normalizeDetail(raw: unknown): DeviceDetails | null
```

`fetchDevices` / `fetchDevice` build the URL as `` `${base}/api/devices` `` / `` `${base}/api/devices/${id}` `` where `base = process.env.DEVICES_API_BASE_URL` — **no fallback**; if `base` is unset, throw `Error('DEVICES_API_BASE_URL is not set')`.

### 2. NEW `app/api/devices/route.ts` — `export async function GET`
- Reads token + base via `fetchDevices()`; if missing → `console.error('[devices] ...')` + `500 { ok:false, error:'not configured' }` (matches `apple-account/route.ts:73-77`).
- Returns `NextResponse.json(data)` — the raw upstream payload.
- On upstream failure → `502 { ok:false, error:'upstream error' }`.
- **No `initData` auth** — inventory is a public catalog view (keeps the GET cacheable).

### 3. NEW `app/api/devices/[id]/route.ts` — `export async function GET(req, { params })`
- Sanitize `id`: reject anything other than `/^[A-Za-z0-9_-]+$/` → `400 { ok:false, error:'invalid id' }`.
- Same env + error pattern. Returns `fetchDevice(id)` JSON.

### 4. NEW `app/api/order/route.ts` — `export async function POST`
Mirrors `submit/route.ts` exactly. Receives `{ device: { id, name, price }, initData }`.

```ts
// validateInitData → 401 'unauthorized' if non-empty invalid
// validate device.name present (non-empty) → else 400 'incomplete'
const user = parseUser(body.initData);
const nameLink = user
  ? `<a href="tg://user?id=${user.id}">${escapeHtml(user.firstName)}</a>`
  : 'کاربر';
const usernameLine = user?.username ? `\n🔗 @${escapeHtml(user.username)}` : '';
const priceLine = device.price ? `\n▫️ <b>قیمت:</b> ${escapeHtml(String(device.price))}` : '';
const summary =
  `🛒 <b>سفارش</b>\n${'─'.repeat(20)}\n\n` +
  `▫️ <b>دستگاه:</b> ${escapeHtml(device.name)}` + priceLine +
  `\n\n${'─'.repeat(20)}\n👤 سفارش‌دهنده: ${nameLink}${usernameLine}`;
const dmButton = user?.username
  ? { inline_keyboard: [[{ text: '💬 پاسخ به سفارش‌دهنده', url: `https://t.me/${user.username}` }]] }
  : undefined;
await sendToGroup(summary, dmButton);
return NextResponse.json({ ok: true });
```
All device strings wrapped in `escapeHtml()` (invariant). On failure → `500 { ok:false, error:'send failed' }`.

### 5. MODIFY `app/page.tsx` — replace inventory placeholder (lines 414-425)

**Imports:** add `useCallback` to the React import; add `import { motion, AnimatePresence, useReducedMotion } from 'motion/react';` and `import { normalizeList, normalizeDetail, type DeviceListItem, type DeviceDetails } from '@/lib/devices';`

**New state:**
```ts
// Inventory list
const [devices, setDevices] = useState<DeviceListItem[]>([]);
const [invLoading, setInvLoading] = useState(false);
const [invError, setInvError] = useState('');
// Sheet + detail
const [selectedId, setSelectedId] = useState<string | number | null>(null);
const [detail, setDetail] = useState<DeviceDetails | null>(null);
const [detailLoading, setDetailLoading] = useState(false);
const [detailError, setDetailError] = useState('');
// Client-side detail cache — key = String(device.id). Survives across opens
// for the component's lifetime; each device is fetched only once.
const [detailCache, setDetailCache] = useState<Record<string, DeviceDetails>>({});
// Order (lives inside the sheet)
const [orderSubmitting, setOrderSubmitting] = useState(false);
const [orderDone, setOrderDone] = useState(false);
const [orderError, setOrderError] = useState('');
```

**Fetch list on tab open** (first mount-time fetch in the codebase — mirrors the click-handler recipe but in a `useEffect`):
```ts
useEffect(() => {
  if (tab !== 'inventory' || devices.length || invLoading) return;
  setInvLoading(true); setInvError('');
  fetch('/api/devices').then(r => r.json()).then(raw => setDevices(normalizeList(raw)))
    .catch(() => setInvError('خطا در دریافت لیست دستگاه‌ها'))
    .finally(() => setInvLoading(false));
}, [tab, devices.length, invLoading]);
```

**Open sheet — cache-first, fetch on miss:**
```ts
const openDevice = useCallback((id: string | number) => {
  const key = String(id);
  setSelectedId(id);
  setOrderDone(false); setOrderError('');

  // Cache hit → show instantly, no loading state, no network request.
  const cached = detailCache[key];
  if (cached) {
    setDetail(cached);
    setDetailError('');
    setDetailLoading(false);
    return;
  }
  // Cache miss → fetch, then store in the cache for next time.
  setDetail(null);
  setDetailError('');
  setDetailLoading(true);
  fetch(`/api/devices/${encodeURIComponent(id)}`)
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(raw => {
      const d = normalizeDetail(raw);
      setDetail(d);
      if (d) setDetailCache(prev => ({ ...prev, [key]: d }));
    })
    .catch(() => setDetailError('خطا در دریافت اطلاعات دستگاه'))
    .finally(() => setDetailLoading(false));
}, [detailCache]);
```

**Place order:**
```ts
async function handleOrder() {
  const dev = detail ?? devices.find(d => d.id === selectedId);
  if (!dev) return;
  const initData = window?.Telegram?.WebApp?.initData ?? '';
  setOrderSubmitting(true); setOrderError('');
  try {
    const r = await fetch('/api/order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device: { id: dev.id, name: dev.name, price: dev.price }, initData }),
    });
    if (!r.ok) throw new Error();
    setOrderDone(true);
    setTimeout(() => { setSelectedId(null); setOrderDone(false); }, 2500); // close sheet after success
  } catch { setOrderError('خطا در ثبت سفارش'); }
  finally { setOrderSubmitting(false); }
}
```

**Device list UI** — sleek cards in a vertical stack (inline styles + new `s.*` entries, `var(--*)` convention):
- `s.deviceCard` — `display:flex; alignItems:center; gap:12px; background:var(--secondary-bg); border:1px solid var(--border); borderRadius:14px; padding:12px;` with `whileTap={{ scale: 0.97 }}` (Apple §1: respond on press).
- **Thumbnail** (56×56, `borderRadius:12px`, `objectFit:cover`): if an image field is present → `<img>`; else → centered `<i className="fa-solid fa-mobile-screen-button" />` in a tinted circle. Design-for-both fallback.
- **Text block**: device name (`fontSize:15px, fontWeight:600, color:var(--text)`), price below (`fontSize:14px, fontWeight:600, color:var(--btn)` via `fmt()` if numeric, raw otherwise) — or "استعلام قیمت" hint if no price.
- **Chevron** `fa-chevron-left` (RTL → points left) in `var(--hint)`.
- Row order: thumbnail on the **right**, chevron on the **left** (RTL).

**Loading state** — 4 skeleton cards: pulsing placeholder blocks (`motion.div animate={{ opacity:[0.4,0.8,0.4] }} transition={{ duration:1.2, repeat:Infinity }}`).

**Error state** — centered `fa-triangle-exclamation` + message + "تلاش مجدد" button.

**Empty state** — centered `fa-box-open` + "موجودی خالی است".

**New `s.*` styles**: `deviceList`, `deviceCard`, `thumb`, `thumbFallback`, `deviceName`, `devicePrice`, `skeletonRow`.

### 6. NEW `DeviceSheet` component (in `page.tsx`, near `ResultRow`)
A bottom sheet implementing apple-design principles. Rendered as a `position:fixed` overlay (sibling to `<main>`) when `selectedId !== null`, wrapped in `<AnimatePresence>`.

```
┌─────────────────────────────┐
│  (scrim — dim, click×close)  │   motion.div opacity 0→1, exit→0
│                              │
├──────────────────────────────┤   ← sheet docks at bottom
│  ─── drag handle ───         │   motion.div drag="y"
│  [image / icon]   name       │   initial y:'100%' → animate y:0
│  price                       │   exit y:'100%'
│  ─────────────────────       │   spring: { type:'spring', bounce:0.2, duration:0.4 }
│  specs rows (ResultRow-like) │   dragConstraints {top:0,bottom:0}
│  ...                         │   dragElastic {top:0, bottom:0.4}  ← rubber-band downward
│  ┌─────────────────────────┐ │   onDragEnd: dismiss if offset.y>120 || velocity.y>500
│  │  🛒 ثبت سفارش            │ │   ← order CTA (s.submitBtn + fa-cart-shopping)
│  └─────────────────────────┘ │
└──────────────────────────────┘
```

Apple-design principles applied:
- **Response / direct manipulation** — `drag="y"` gives 1:1 finger tracking; `whileTap` on cards + order button.
- **Interruptibility** — `motion` springs animate from the live value; grabbing mid-animation follows the finger. `AnimatePresence` keeps exit smooth.
- **Springs** — `{ type:'spring', bounce:0.2, duration:0.4 }` ≈ Apple damping 0.8 / response 0.3 (§4). Slight bounce earned because a drag preceded it.
- **Velocity handoff** — `onDragEnd` reads `info.velocity.y`; flick >500px/s dismisses even with small offset (§5/§6).
- **Rubber-banding** — `dragElastic: { top: 0, bottom: 0.4 }` resists progressively downward, no resistance upward (§9).
- **Spatial consistency** — enters from bottom, exits to bottom (§7).
- **Materials** — sheet `rgba` semi-transparent + `backdrop-filter: blur(20px) saturate(180%)` + bright top edge border (§12). Scrim `rgba(0,0,0,0.4)`. On `prefers-reduced-transparency` → solid `var(--secondary-bg)`.
- **Reduced motion** — `useReducedMotion()`: swap spring → `{ duration: 0.2 }` opacity cross-fade, `transform:none`, disable drag (§14).
- **Body scroll lock** — `useEffect` toggles `document.body.style.overflow='hidden'` while open.
- Max height `85vh`, internal `overflowY:auto`, `borderTopRadius:20px`, drag handle (40×4 pill, `var(--hint)`, centered, `margin:8px auto`).

**Sheet content states:**
- Cache hit → detail renders instantly, no skeleton flash.
- `detailLoading` → in-sheet skeleton (pulsing image block + 3 text lines) — only on first-ever open of a device.
- `detailError` → inline error + "تلاش مجدد" button (re-calls `openDevice`).
- `detail` loaded → large image (or big FA icon) header, name (`fontSize:20px, fontWeight:700, letterSpacing:-0.01em`), price prominent, specs as label/value rows reusing the `ResultRow` visual pattern inside an `s.card`, then the **order CTA** at the bottom.
- `orderDone` → replace sheet content with a centered success: green `fa-circle-check` + "سفارش شما ثبت شد" (auto-closes after 2.5s).
- `orderError` → red error text below the order button.

**Order CTA**: full-width button, `s.submitBtn` style + `fa-cart-shopping` icon + label "ثبت سفارش". Disabled while `orderSubmitting` (label → "در حال ثبت..."). `whileTap={{ scale: 0.97 }}`.

### 7. MODIFY `package.json` — add dependency
`"motion": "^12"` (React entry at `motion/react`). Provides `motion`, `AnimatePresence`, `useReducedMotion`, drag + spring physics. Single new dependency.

### 8. MODIFY `.env.local.example` — append
```
# Base URL of the devices/inventory API (required — no default in code).
# Dev: http://localhost:8000  |  Prod: your public API host
DEVICES_API_BASE_URL=

# Static bearer token used to authenticate against the devices API (server-side only)
DEVICES_API_TOKEN=
```

## Verification
- `npm install` (adds `motion`), then `npx tsc --noEmit` + `npm run build` must pass.
- `npm run dev`: with a server at the dev URL + `.env.local` set, open inventory → list loads, skeletons pulse, tapping a device slides the sheet up with a spring, dragging down dismisses. Tapping "ثبت سفارش" sends the order to the group and shows the success state. Re-opening the same device shows details instantly (no fetch, no loading).
- Reduced-motion: toggle macOS "Reduce Motion" → sheet cross-fades, no spring/drag.
- Existing POST routes (submit, apple-account, apple-support) untouched.

## Out of scope
- `AGENTS.md` not updated — I'll add the new routes + env vars to its tables as a small doc touch if you want.
- Cache is in-memory only (clears on page reload) — no persistence to localStorage.