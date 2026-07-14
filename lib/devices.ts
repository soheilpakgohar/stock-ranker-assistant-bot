/**
 * Server-side fetch helpers for the external devices/inventory API.
 *
 * The bearer token (DEVICES_API_TOKEN) never leaves the server — the Mini App
 * talks to our own `/api/devices` proxy routes, which attach the Authorization
 * header here. The base URL (DEVICES_API_BASE_URL) has no hardcoded default;
 * `localhost:8000` is dev-only and set by the developer in `.env.local`.
 */

export type DeviceListItem = {
  id: string | number;
  name: string;
  price?: number | string;
  image?: string;
  image_url?: string;
  thumbnail?: string;
  photo?: string;
  brand?: string;
  model?: string;
  color?: string;
  batteryHealth?: number;
  in_stock?: boolean;
  [key: string]: unknown;
};

export type DeviceSpec = { label: string; value: string };

export type DeviceDetails = DeviceListItem & {
  description?: string;
  specs?: DeviceSpec[];
  storage?: string;
  color?: string;
  condition?: string;
  warranty?: string;
  images?: string[];
  [key: string]: unknown;
};

function baseUrl(): string {
  const base = process.env.DEVICES_API_BASE_URL;
  if (!base) throw new Error('DEVICES_API_BASE_URL is not set');
  return base.replace(/\/+$/, ''); // strip trailing slash
}

function token(): string {
  const t = process.env.DEVICES_API_TOKEN;
  if (!t) throw new Error('DEVICES_API_TOKEN is not set');
  return t;
}

/**
 * The API returns relative photo paths (e.g. "/storage/devices/1/x.jpg")
 * that can't be resolved by the client. Prefix them with the API base URL
 * server-side so the client always receives absolute URLs.
 * Mutates the object in place — called on both list items and detail objects.
 */
function resolvePhotoUrls(obj: Record<string, unknown>, base: string): void {
  for (const field of ['photos', 'images'] as const) {
    if (Array.isArray(obj[field])) {
      obj[field] = (obj[field] as unknown[])
        .filter((p): p is string => typeof p === 'string' && p.length > 0)
        .map((p) => (p.startsWith('http') ? p : `${base}${p.startsWith('/') ? '' : '/'}${p}`));
    }
  }
  for (const field of ['image', 'image_url', 'thumbnail', 'photo'] as const) {
    const v = obj[field];
    if (typeof v === 'string' && v && !v.startsWith('http')) {
      obj[field] = `${base}${v.startsWith('/') ? '' : '/'}${v}`;
    }
  }
}

/** Fetch the device list (array, shape unknown upstream). Throws on HTTP error. */
export async function fetchDevices(): Promise<unknown> {
  const res = await fetch(`${baseUrl()}/api/devices`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`devices API list failed ${res.status}: ${text}`);
  }
  const data = await res.json();
  const base = baseUrl();

  // Resolve relative photo paths on every list item so thumbnails work too.
  const arr = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown })?.data)
      ? (data as { data: unknown[] }).data
      : null;
  if (arr) {
    for (const item of arr) {
      if (item && typeof item === 'object') resolvePhotoUrls(item as Record<string, unknown>, base);
    }
  }
  return data;
}

/** Fetch a single device's details by id. Throws on HTTP error. */
export async function fetchDevice(id: string): Promise<unknown> {
  const res = await fetch(`${baseUrl()}/api/devices/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`devices API detail failed ${res.status}: ${text}`);
  }
  const data = await res.json();

  if (data && typeof data === 'object') {
    resolvePhotoUrls(data as Record<string, unknown>, baseUrl());
  }
  return data;
}

// ── Client-side normalizers ──────────────────────────────────────────────
// The upstream payload shape is unknown, so we coerce defensively: render any
// known field if present, skip if absent. Never throw on unexpected shapes.

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : v == null ? undefined : String(v);
}

function asPrice(v: unknown): number | string | undefined {
  if (typeof v === 'number' || typeof v === 'string') return v;
  return undefined;
}

function pickImage(obj: Record<string, unknown>): string | undefined {
  return (
    asString(obj.image) ??
    asString(obj.image_url) ??
    asString(obj.thumbnail) ??
    asString(obj.photo)
  );
}

function coerceId(v: unknown): string | number | undefined {
  if (typeof v === 'string' || typeof v === 'number') return v;
  return undefined;
}

/** Pick a human-friendly device name from any of the common field names. */
function pickName(o: Record<string, unknown>): string | undefined {
  return asString(o.name) ?? asString(o.title) ?? asString(o.model_name) ?? asString(o.model);
}

/** Normalize the list payload into DeviceListItem[]. */
export function normalizeList(raw: unknown): DeviceListItem[] {
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { data?: unknown })?.data)
      ? ((raw as { data: unknown[] }).data)
      : [];
  return arr
    .map((item) => {
      if (!item || typeof item !== 'object') return undefined;
      const o = item as Record<string, unknown>;
      const id = coerceId(o.id) ?? coerceId(o._id);
      const name = pickName(o);
      if (id == null || !name) return undefined;
      return {
        id,
        name,
        price: asPrice(o.price) ?? asPrice(o.cost),
        image: pickImage(o),
        brand: asString(o.brand),
        model: asString(o.model) ?? asString(o.model_name),
        color: asString(o.color),
        batteryHealth: typeof o.battery_health === 'number' ? o.battery_health : undefined,
        in_stock: typeof o.in_stock === 'boolean' ? o.in_stock : undefined,
      } as DeviceListItem;
    })
    .filter((d): d is DeviceListItem => d !== undefined);
}

/** Normalize a single device's detail payload into DeviceDetails | null. */
export function normalizeDetail(raw: unknown): DeviceDetails | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = (raw as { data?: Record<string, unknown> })?.data ?? (raw as Record<string, unknown>);
  const id = coerceId(o.id) ?? coerceId(o._id);
  const name = pickName(o);
  if (id == null || !name) return null;

  // Flatten specs whether they arrive as a record, an array of {label,value},
  // or as flat top-level device fields (the actual API shape).
  let specs: DeviceSpec[] | undefined;
  const rawSpecs = o.specs ?? o.specifications ?? o.attributes;
  if (Array.isArray(rawSpecs)) {
    const rows = rawSpecs
      .map((s) => {
        if (!s || typeof s !== 'object') return undefined;
        const r = s as Record<string, unknown>;
        const label = asString(r.label) ?? asString(r.key) ?? asString(r.name);
        const value = asString(r.value);
        return label && value ? { label, value } : undefined;
      })
      .filter((s): s is DeviceSpec => s !== undefined);
    if (rows.length) specs = rows;
  } else if (rawSpecs && typeof rawSpecs === 'object') {
    const rows = Object.entries(rawSpecs as Record<string, unknown>)
      .map(([k, v]) => {
        const value = asString(v);
        return value ? { label: k, value } : undefined;
      })
      .filter((s): s is DeviceSpec => s !== undefined);
    if (rows.length) specs = rows;
  }

  // Collect flat top-level device fields the API actually returns, with
  // Persian labels, so they show up as spec rows in the detail sheet.
  const FIELD_LABELS: Record<string, string> = {
    color: 'رنگ',
    battery_health: 'سلامت باتری',
    scratches: 'خط و خش',
    problems: 'مشکلات',
    icloud_lock: 'قفل آیکلاود',
    package_type: 'پک',
    storage: 'حافظه',
    condition: 'وضعیت',
    warranty: 'گارانتی',
    brand: 'برند',
  };
  if (!specs) {
    const rows: DeviceSpec[] = [];
    for (const [key, label] of Object.entries(FIELD_LABELS)) {
      if (key in o) {
        const v = o[key];
        const value =
          typeof v === 'boolean' ? (v ? 'بله' : 'خیر') :
            typeof v === 'number' ? `${v.toLocaleString('fa-IR')}٪` :
              asString(v);
        if (value) rows.push({ label, value });
      }
    }
    if (rows.length) specs = rows;
  }

  const rawPhotos = Array.isArray(o.photos) ? o.photos : Array.isArray(o.images) ? o.images : undefined;
  const images = rawPhotos
    ? (rawPhotos.map(asString).filter((x): x is string => !!x))
    : undefined;

  return {
    id,
    name,
    price: asPrice(o.price) ?? asPrice(o.cost),
    image: pickImage(o),
    brand: asString(o.brand),
    model: asString(o.model) ?? asString(o.model_name),
    in_stock: typeof o.in_stock === 'boolean' ? o.in_stock : undefined,
    description: asString(o.description) ?? asString(o.explanation),
    specs,
    storage: asString(o.storage) ?? asString(o.memory),
    color: asString(o.color),
    condition: asString(o.condition),
    warranty: asString(o.warranty),
    images: images?.length ? images : undefined,
  };
}
