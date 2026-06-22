import { NextResponse } from 'next/server';
import { setMyCommands } from '@/lib/telegram';

export async function GET(): Promise<NextResponse> {
  await setMyCommands();
  return NextResponse.json({ ok: true, message: 'Bot commands registered.' });
}
