# Plan: Extract tabs into self-contained component files

Split `app/page.tsx` (1707 lines) into 7 tab components + shared files. Each tab owns its state and logic — `Home` becomes a ~80-line shell that renders the active tab and the tab bar. No behavioral changes — this is a pure refactor.

## New file structure

```
app/
├── page.tsx                  ← ~80 lines: 'use client', Home shell (tab state, mount effect, tab bar, renders tabs)
├── layout.tsx                ← unchanged
├── globals.css               ← unchanged
components/
├── FormTab.tsx               ← form state + photo upload + handleSubmit + compressImage + extractPlaceholder
├── CalcTab.tsx               ← calc state + derived values + round5 + fmt
├── InventoryTab.tsx          ← device list + fetch effect + openDevice + detailCache + closeSheet + handleOrder + renders <DeviceSheet>
├── DeviceSheet.tsx           ← DeviceSheet + PhotoGallery + PhotoViewer + usePrefersReducedTransparency + formatPrice
├── ContactTab.tsx            ← static map + contact info (uses ResultRow)
├── AppleTab.tsx              ← apple state + support + handleAppleSubmit + PERSIAN_MONTHS + PERSIAN_DAYS
├── ResultRow.tsx             ← shared label/value row (used by CalcTab + ContactTab)
lib/
├── styles.ts                 ← the full `s` object (all 19 keys, CSSProperties + function entries)
├── useCloseTimer.ts           ← shared close-timer hook (clears previous timer, sets new one)
├── telegram.ts               ← unchanged
├── initData.ts               ← unchanged
├── devices.ts                ← unchanged
├── questions.ts              ← unchanged
```

## What moves where

### `lib/styles.ts` (NEW)
Move the entire `s` object (lines 1500-1707) verbatim. Export `const s = { ... }` and the `CSSProperties` type import. Every tab imports `{ s }` from `@/lib/styles`.

### `lib/useCloseTimer.ts` (NEW)
```ts
import { useRef, useCallback } from 'react';
export function useCloseTimer() {
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedule = useCallback((fn: () => void, ms: number) => {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(fn, ms);
  }, []);
  const clear = useCallback(() => {
    if (ref.current) { clearTimeout(ref.current); ref.current = null; }
  }, []);
  return { schedule, clear };
}
```
Used by FormTab (close after submit), AppleTab (close after submit), InventoryTab (close sheet after order).

### `components/ResultRow.tsx` (NEW)
Move `ResultRow` (lines 1424-1494) verbatim. Imports `{ useState }`. Export as named `ResultRow`.

### `components/FormTab.tsx` (NEW)
`'use client'`. Owns:
- State: `answers, photos, photoError, submitting, done, formError`
- `compressImage` helper (lines 47-68)
- `extractPlaceholder` helper (lines 1495-1498)
- `handleSubmit` (lines 221-247)
- The entire form tab JSX (lines 340-467), including the success screen with reset
- Imports: `{ useState }`, `{ questions }`, `{ s }`, `{ useCloseTimer }`
- The reset button calls `clear()` from `useCloseTimer` then resets state
- On submit success: `schedule(() => window?.Telegram?.WebApp?.close(), 2500)`

### `components/CalcTab.tsx` (NEW)
`'use client'`. Owns:
- State: `price, down, months, chequeMode`
- `round5`, `fmt` (lines 33-35) — calc-only, live here
- All derived values (lines 313-333)
- The entire calc tab JSX (lines 470-615)
- Imports: `{ useState }`, `{ s }`, `{ ResultRow }`

### `components/InventoryTab.tsx` (NEW)
`'use client'`. Owns:
- State: `devices, invLoading, invError, invFetched, selectedId, detail, detailLoading, detailError, detailCache, orderSubmitting, orderDone, orderError`
- The fetch `useEffect` (lines 139-157)
- `openDevice` (lines 160-187), `closeSheet` (lines 189-193), `handleOrder` (lines 196-219)
- The entire inventory tab JSX (lines 618-710)
- Renders `<DeviceSheet>` (lines 964-975)
- Imports: `{ useState, useEffect, useCallback }`, `{ motion }`, `{ normalizeList, normalizeDetail, types }`, `{ s }`, `{ DeviceSheet }`, `{ useCloseTimer }`
- On order success: `schedule(() => closeSheet(), 2500)`

### `components/DeviceSheet.tsx` (NEW)
`'use client'`. Groups the 3 tightly-coupled components + their helper:
- `formatPrice` (lines 38-40) — used by both InventoryTab's list card and DeviceSheet
- `usePrefersReducedTransparency` (lines 1412-1422)
- `DeviceSheet` (lines 998-1201)
- `PhotoGallery` (lines 1203-1295)
- `PhotoViewer` (lines 1296-1410)
- Imports: `{ useState, useEffect, useRef, useCallback, CSSProperties }`, `{ motion, AnimatePresence, useReducedMotion }`, `{ s }`, `{ type DeviceDetails }` from `@/lib/devices`
- Exports: `DeviceSheet` (named), `formatPrice` (named — InventoryTab imports it for the list card)

### `components/ContactTab.tsx` (NEW)
`'use client'`. The simplest tab:
- The entire contact tab JSX (lines 713-754)
- Imports: `{ s }`, `{ ResultRow }`

### `components/AppleTab.tsx` (NEW)
`'use client'`. Owns:
- State: `audioPlayed, accepted, fullName, birthDay, birthMonth, birthYear, email, appleSubmitting, appleDone, appleError, supportSubmitting, supportError`
- `PERSIAN_MONTHS`, `PERSIAN_DAYS` (lines 25-31) — apple-only
- `handleSupport` (lines 249-269), `handleAppleSubmit` (lines 271-311)
- The entire apple tab JSX (lines 757-960)
- Imports: `{ useState }`, `{ s }`, `{ useCloseTimer }`

### `app/page.tsx` (REWRITTEN — ~80 lines)
```tsx
'use client';
import { useState, useEffect } from 'react';
import { s } from '@/lib/styles';
import { FormTab } from '@/components/FormTab';
import { CalcTab } from '@/components/CalcTab';
import { InventoryTab } from '@/components/InventoryTab';
import { ContactTab } from '@/components/ContactTab';
import { AppleTab } from '@/components/AppleTab';

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        expand(): void; ready(): void; initData: string;
        close(): void; colorScheme: 'light' | 'dark';
      };
    };
  }
}

type Tab = 'form' | 'calc' | 'inventory' | 'contact' | 'apple';

export default function Home() {
  const [tab, setTab] = useState<Tab>('form');

  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    if (tg) {
      tg.expand(); tg.ready();
      if (tg.colorScheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 88px' }}>
        {tab === 'form' && <FormTab />}
        {tab === 'calc' && <CalcTab />}
        {tab === 'inventory' && <InventoryTab />}
        {tab === 'contact' && <ContactTab />}
        {tab === 'apple' && <AppleTab />}
      </main>
      <nav style={s.tabBar}>
        {([...] as [Tab, string, string][]).map(...)}  // same tab bar JSX
      </nav>
    </div>
  );
}
```

## Key details

- **No prop drilling** — each tab is self-contained, rendered as `<FormTab />` with zero props.
- **`useCloseTimer`** replaces the shared `closeTimerRef`. Each tab creates its own instance.
- **`Window.Telegram` declaration** stays in `page.tsx` (global augmentation works from any file, but keeping it where `Home` lives is cleanest).
- **`Tab` type** stays in `page.tsx` — only `Home` needs it for the tab bar.
- **`formatPrice`** is exported from `DeviceSheet.tsx` and imported by `InventoryTab.tsx` (used in the list card). This avoids a separate utils file for one function used only by inventory-related code.
- **Every component file starts with `'use client'`** since they all use hooks/state.
- **No behavioral changes** — same UI, same logic, same styles, same API calls. Pure file extraction.

## Verification
- `npx tsc --noEmit` + `npm run lint` + `npm run build` must pass.
- Manual: open each tab, verify form submission, calc, inventory list + sheet + order, contact, apple account flow all work identically.

## Out of scope
- AGENTS.md update — will do as a follow-up after the refactor is verified.
- No new dependencies.
- No CSS changes.