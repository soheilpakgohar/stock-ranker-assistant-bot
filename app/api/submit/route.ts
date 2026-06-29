import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { questions } from '@/lib/questions';
import { sendToGroup, escapeHtml } from '@/lib/telegram';

function validateInitData(initData: string, token: string): boolean {
  if (!initData) return true; // allow browser access; user info simply won't appear in the message
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;
    params.delete('hash');
    const checkStr = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secret = createHmac('sha256', 'WebAppData').update(token).digest();
    return createHmac('sha256', secret).update(checkStr).digest('hex') === hash;
  } catch {
    return false;
  }
}

function parseUser(initData: string): { id: number; firstName: string; username?: string } | null {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) return null;
    const u = JSON.parse(userStr);
    return { id: u.id, firstName: u.first_name ?? 'کاربر', username: u.username };
  } catch {
    return null;
  }
}

function buildSummary(answers: Record<string, string>, user: { id: number; firstName: string; username?: string } | null): string {
  const lines = questions.map(q => `▫️ <b>${q.label}:</b> ${escapeHtml(answers[q.id] ?? '—')}`);
  const nameLink = user
    ? `<a href="tg://user?id=${user.id}">${escapeHtml(user.firstName)}</a>`
    : 'کاربر';
  const usernameLine = user?.username ? `\n🔗 @${escapeHtml(user.username)}` : '';
  return (
    `📋 <b>اطلاعات گوشی</b>\n${'─'.repeat(20)}\n\n` +
    lines.join('\n') +
    `\n\n${'─'.repeat(20)}\n👤 فروشنده: ${nameLink}${usernameLine}`
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { answers: Record<string, string>; initData: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
  if (!validateInitData(body.initData, token)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const user = parseUser(body.initData);
    const summary = buildSummary(body.answers, user);
    const dmButton = user?.username
      ? { inline_keyboard: [[{ text: '💬 ارسال پیام به فروشنده', url: `https://t.me/${user.username}` }]] }
      : undefined;
    await sendToGroup(summary, dmButton);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[submit]', err);
    return NextResponse.json({ ok: false, error: 'send failed' }, { status: 500 });
  }
}
