import { NextResponse } from 'next/server';
import { fetchDevices } from '@/lib/devices';

/**
 * GET /api/devices
 * Transparent proxy to the external devices API. Attaches the bearer token
 * server-side so the client never sees it. Returns the upstream JSON unchanged.
 *
 * No initData auth — inventory is a public catalog view.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const data = await fetchDevices();
    return NextResponse.json(data);
  } catch (err) {
    // Missing env (base url / token) → not configured; upstream failure → 502.
    const msg = err instanceof Error ? err.message : String(err);
    const notConfigured = msg.includes('is not set');
    if (notConfigured) console.error('[devices]', msg);
    return NextResponse.json(
      { ok: false, error: notConfigured ? 'not configured' : 'upstream error' },
      { status: notConfigured ? 500 : 502 },
    );
  }
}
