import { NextRequest, NextResponse } from 'next/server';
import { sendToGroup, escapeHtml } from '@/lib/telegram';
import { validateInitData, parseUser } from '@/lib/initData';

type OrderBody = {
  device?: { id?: string | number; name?: string; price?: number | string };
  initData?: string;
};

function buildOrderSummary(
  device: { name: string; price?: number | string },
  user: { id: number; firstName: string; username?: string } | null,
): string {
  const nameLink = user
    ? `<a href="tg://user?id=${user.id}">${escapeHtml(user.firstName)}</a>`
    : 'کاربر';
  const usernameLine = user?.username ? `\n🔗 @${escapeHtml(user.username)}` : '';
  const priceLine = device.price ? `\n▫️ <b>قیمت:</b> ${escapeHtml(String(device.price))}` : '';
  return (
    `🛒 <b>سفارش</b>\n${'─'.repeat(20)}\n\n` +
    `▫️ <b>دستگاه:</b> ${escapeHtml(device.name)}` +
    priceLine +
    `\n\n${'─'.repeat(20)}\n👤 سفارش‌دهنده: ${nameLink}${usernameLine}`
  );
}

/**
 * POST /api/order
 * Sends a brief device summary + the submitter's identity to the Telegram group
 * as an "Order" message. Mirrors the /api/submit pattern (initData validation,
 * parseUser, DM button when a username exists).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: OrderBody;
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

  const deviceName = body.device?.name?.trim() ?? '';
  if (!deviceName) {
    return NextResponse.json({ ok: false, error: 'incomplete' }, { status: 400 });
  }

  try {
    const user = parseUser(initData);
    const summary = buildOrderSummary(
      { name: deviceName, price: body.device?.price },
      user,
    );
    const dmButton = user?.username
      ? { inline_keyboard: [[{ text: '💬 پاسخ به سفارش‌دهنده', url: `https://t.me/${user.username}` }]] }
      : undefined;
    await sendToGroup(summary, dmButton);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[order]', err);
    return NextResponse.json({ ok: false, error: 'send failed' }, { status: 500 });
  }
}
