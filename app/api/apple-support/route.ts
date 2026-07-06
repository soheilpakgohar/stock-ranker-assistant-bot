import { NextRequest, NextResponse } from 'next/server';
import { sendMessage, escapeHtml } from '@/lib/telegram';
import { validateInitData, parseUser } from '@/lib/initData';

type SupportBody = { initData?: string };

function buildSupportMessage(user: { id: number; firstName: string; username?: string } | null): string {
  const nameLink = user
    ? `<a href="tg://user?id=${user.id}">${escapeHtml(user.firstName)}</a>`
    : 'کاربر';
  const usernameLine = user?.username ? `\n🔗 @${escapeHtml(user.username)}` : '';
  return (
    `🎧 <b>درخواست پشتیبانی</b>\n${'─'.repeat(20)}\n\n` +
    `این کاربر درخواست کمک/پشتیبانی کرده است.\n` +
    `\n${'─'.repeat(20)}\n👤 کاربر: ${nameLink}${usernameLine}`
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: SupportBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const initData = body.initData ?? '';
  if (!validateInitData(initData, token)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const handlerId = process.env.APPLE_ACCOUNT_HANDLER_ID;
  if (!handlerId) {
    console.error('[apple-support] APPLE_ACCOUNT_HANDLER_ID is not set');
    return NextResponse.json({ ok: false, error: 'not configured' }, { status: 500 });
  }

  try {
    const user = parseUser(initData);
    const message = buildSupportMessage(user);
    const replyButton = user?.username
      ? { inline_keyboard: [[{ text: '💬 پاسخ به کاربر', url: `https://t.me/${user.username}` }]] }
      : undefined;
    await sendMessage(Number(handlerId), message, replyButton);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[apple-support]', err);
    return NextResponse.json({ ok: false, error: 'send failed' }, { status: 500 });
  }
}
