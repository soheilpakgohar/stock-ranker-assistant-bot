# Plan: Photo upload in the phone form (0–3 photos, in-memory only)

Add an optional photo upload field to the form tab. The user can attach up to 3 photos of their phone. The photos are sent **alongside** the text summary to the group, flowing through the server **in memory only** — never written to disk or a database. The text summary arrives first; photos arrive as a reply to it.

## Data flow

```
Client (page.tsx)                    Server (submit/route.ts)           Telegram
  FormData (multipart/form-data) ──► parse fields + validate          ──► sendMessage (text summary)
    - answers (JSON string)              send text summary first            → message_id
    - initData                           send photos as reply to it    ──► sendPhoto / sendMediaGroup
    - photo1, photo2, photo3 (files)     (raw bytes → Telegram API)         (reply_to message_id)
                                         discard bytes after send
```

Photos exist only as `File` objects on the client and as `FormData` parts in transit. The server reads them into `Blob`/`Buffer` and forwards them to the Telegram API in the same request cycle — nothing is persisted.

## Telegram API mechanics

- **1 photo** → `sendPhoto` with `reply_parameters: { message_id }` (reply to the summary).
- **2–3 photos** → `sendMediaGroup` (min 2 items required by Telegram) with `reply_parameters: { message_id }`.
- Photos uploaded as `multipart/form-data` via `attach://photoN` references. Caption goes on the first photo only (0–1024 chars, HTML parse mode).
- `sendMessage` returns `{ ok, result: { message_id } }` — capture `message_id` to reply photos to it.
- Max 10MB per photo ( enforced by a client-side check before upload).

## Files

### 1. MODIFY `lib/telegram.ts` — add multipart-capable helpers

Add two new exports alongside the existing JSON-only `telegramRequest`:

```ts
/**
 * Send a single photo via multipart/form-data.
 * photo: a Blob/Buffer + filename. Returns message_id of the sent photo.
 */
export async function sendPhoto(
  chatId: number,
  photo: { data: Blob; filename: string },
  caption: string,
  replyToMessageId?: number,
): Promise<number>

/**
 * Send 2-10 photos as a media group (album) via multipart/form-data.
 * photos: array of { data, filename }. Caption applied to first item only.
 * Returns the message_id of the first photo in the group.
 */
export async function sendMediaGroup(
  chatId: number,
  photos: { data: Blob; filename: string }[],
  caption: string,
  replyToMessageId?: number,
): Promise<number>
```

Both build a `FormData` (Web API, available in Next.js server runtime):
- `chat_id` as text field
- `media` as a JSON string field (`[{type:"photo", media:"attach://photo0", caption:"...", parse_mode:"HTML"}, ...]` or single `[{...}]` for sendPhoto)
- Each photo as a binary field named `photo0`, `photo1`, etc. (the `attach://` name matches)
- `reply_parameters` as a JSON-stringified `{ message_id }` when provided
- `Content-Type` header is **not** set manually — `FormData` sets it with the boundary automatically

Also: modify `sendMessage` to **return** `message_id` (currently returns `void`). This requires `telegramRequest` to return the parsed JSON instead of void — change it to return `Promise<any>` and have `sendMessage` extract `result.message_id`.

### 2. MODIFY `app/api/submit/route.ts` — accept multipart, send photos after text

Change from `req.json()` to `req.formData()`:
- `answers` field → `JSON.parse(form.get('answers'))` → `Record<string, string>`
- `initData` field → `form.get('initData')` → string
- `photo0`, `photo1`, `photo2` → `form.get('photoN')` → cast to `File` (has `.name`, `.type`, `.size`, and is a `Blob`)

After sending the text summary via `sendToGroup` (which now returns `message_id`):
```ts
const photos = [0, 1, 2]
  .map((i) => form.get(`photo${i}`))
  .filter((f): f is File => f instanceof File && f.size > 0)
  .map((f) => ({ data: f, filename: f.name || `photo.jpg` }));

if (photos.length === 1) {
  await sendPhoto(groupId, photos[0], summary, messageId);
} else if (photos.length >= 2) {
  await sendMediaGroup(groupId, photos, summary, messageId);
}
// 0 photos → do nothing (text-only summary as before)
```

The summary text (built by `buildSummary`) is reused as the photo caption — the group sees the same info in both the message and the album caption. This is fine since captions are 0–1024 chars and the current summary is well under that.

Error handling: if photo sending fails after the text summary succeeds, the text is already delivered — log the error but still return `{ ok: true }` (don't fail the whole submission because a photo upload failed).

### 3. MODIFY `app/page.tsx` — add photo upload UI + FormData submission

**New state:**
```ts
const [photos, setPhotos] = useState<File[]>([]);
```

**New `s.*` style:**
- `photoUpload` — dashed-border box (`border: '2px dashed var(--border)'`, `borderRadius: 12px`, `padding: 16px`, `textAlign: center`, clickable label)
- `photoThumb` — 72×72 thumbnail preview (`borderRadius: 10px`, `objectFit: cover`, position relative)
- `photoRemove` — small X badge on each thumbnail (`position: absolute`, `top: -6px`, `left: -6px`, 20px circle, red bg)

**UI (placed after the `questions.map(...)` block, before the submit button):**
- Label: "عکس‌های دستگاه (اختیاری)" with hint "حداکثر ۳ عکس"
- If fewer than 3 photos: a clickable dashed-border box (wrapping a hidden `<input type="file" accept="image/*" multiple>`) with a camera icon (`fa-camera`) and "افزودن عکس"
- Existing photos shown as a horizontal row of thumbnails, each with a remove (X) button
- On file select: filter to images, append to `photos` up to max 3 (ignore extras), update state

**Modified `handleSubmit`:**
- Validation stays the same (check all questions answered)
- Build `FormData` instead of JSON:
```ts
const fd = new FormData();
fd.append('answers', JSON.stringify(answers));
fd.append('initData', initData);
photos.forEach((p, i) => fd.append(`photo${i}`, p));
```
- Fetch with NO `Content-Type` header (browser sets multipart boundary automatically):
```ts
const res = await fetch('/api/submit', { method: 'POST', body: fd });
```
- Rest of the handler (success/close/error) unchanged
- On the "submit again" reset: also clear `setPhotos([])`

**Client-side size guard:** filter out any file > 10MB on selection, show an inline error "حجم عکس نباید بیشتر از ۱۰ مگابایت باشد".

### 4. MODIFY `AGENTS.md` — document the new multipart submit flow

Update the `/api/submit` row and the submit flow description to note it now accepts `multipart/form-data` with optional photos, and that photos are in-memory only (no persistence).

## What stays unchanged
- `lib/questions.ts` — the photo field is **not** a question; it's a separate UI element outside the questions array (photos aren't a text answer that appears in the summary rows).
- The text summary format (built by `buildSummary`) is unchanged — it still lists all question answers. Photos are sent as a reply with the same summary as caption.
- All other tabs/routes (calc, apple, contact, inventory, order) untouched.

## Verification
- `npx tsc --noEmit` + `npm run build` must pass.
- `npm run dev`: open the form tab → upload 0, 1, 2, and 3 photos → submit → verify the group receives the text summary followed by the photos (or a photo album) as a reply to the text.
- Confirm no files are written to disk anywhere (photos are `File` objects in memory → `FormData` → Telegram API → discarded).

## Out of scope
- No image resizing/compression (photos sent as-is; 10MB client-side guard is the only check).
- No persistence of any kind — the user explicitly does not want photos saved anywhere.
- No photo preview in the success screen (photos are cleared on reset).