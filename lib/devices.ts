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
  return res.json();
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
  return res.json();
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
      const name = asString(o.name) ?? asString(o.title);
      if (id == null || !name) return undefined;
      return {
        id,
        name,
        price: asPrice(o.price) ?? asPrice(o.cost),
        image: pickImage(o),
        brand: asString(o.brand),
        model: asString(o.model),
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
  const name = asString(o.name) ?? asString(o.title);
  if (id == null || !name) return null;

  // Flatten specs whether they arrive as a record or an array of {label,value}/{key,value}.
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

  const images = Array.isArray(o.images)
    ? (o.images.map(asString).filter((x): x is string => !!x))
    : undefined;

  return {
    id,
    name,
    price: asPrice(o.price) ?? asPrice(o.cost),
    image: pickImage(o),
    brand: asString(o.brand),
    model: asString(o.model),
    in_stock: typeof o.in_stock === 'boolean' ? o.in_stock : undefined,
    description: asString(o.description),
    specs,
    storage: asString(o.storage) ?? asString(o.memory),
    color: asString(o.color),
    condition: asString(o.condition),
    warranty: asString(o.warranty),
    images: images?.length ? images : undefined,
  };
}
