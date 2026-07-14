import { NextRequest, NextResponse } from 'next/server';
import { fetchDevice } from '@/lib/devices';

/**
 * GET /api/devices/:id
 * Transparent proxy to the external devices API for a single device's details.
 * Attaches the bearer token server-side. `params` is a Promise in Next.js 16.
 *
 * No initData auth — inventory is a public catalog view.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  // Reject anything that isn't a safe path segment before it reaches the upstream URL.
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    return NextResponse.json({ ok: false, error: 'invalid id' }, { status: 400 });
  }

  try {
    const data = await fetchDevice(id);
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const notConfigured = msg.includes('is not set');
    if (notConfigured) console.error('[devices/detail]', msg);
    return NextResponse.json(
      { ok: false, error: notConfigured ? 'not configured' : 'upstream error' },
      { status: notConfigured ? 500 : 502 },
    );
  }
}
