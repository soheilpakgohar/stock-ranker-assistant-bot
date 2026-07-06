import { NextRequest, NextResponse } from 'next/server';
import { questions } from '@/lib/questions';
import { sendToGroup, escapeHtml } from '@/lib/telegram';
import { validateInitData, parseUser } from '@/lib/initData';

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

  const missingIds = questions.filter(q => !body.answers[q.id]?.trim()).map(q => q.id);
  if (missingIds.length > 0) {
    return NextResponse.json({ ok: false, error: 'incomplete', missing: missingIds }, { status: 400 });
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
