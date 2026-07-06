import { NextRequest, NextResponse } from 'next/server';
import { sendMessage, escapeHtml } from '@/lib/telegram';
import { validateInitData, parseUser } from '@/lib/initData';

// Persian (Jalali) month names, indexed 1..12 — index 0 is a placeholder.
const PERSIAN_MONTHS = [
  '', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AppleAccountBody = {
  fullName?: string;
  birthDay?: string;
  birthMonth?: string; // 1..12 (as string from the <select>)
  birthYear?: string;
  email?: string;
  initData?: string;
};

function buildSummary(
  data: { fullName: string; birthDay: string; birthMonth: string; birthYear: string; email: string },
  user: { id: number; firstName: string; username?: string } | null,
): string {
  const monthName = PERSIAN_MONTHS[Number(data.birthMonth)] ?? '—';
  const birthday = `${escapeHtml(data.birthDay)} / ${escapeHtml(monthName)} / ${escapeHtml(data.birthYear)}`;
  const nameLink = user
    ? `<a href="tg://user?id=${user.id}">${escapeHtml(user.firstName)}</a>`
    : 'کاربر';
  const usernameLine = user?.username ? `\n🔗 @${escapeHtml(user.username)}` : '';
  return (
    `🍏 <b>درخواست ساخت حساب اپل</b>\n${'─'.repeat(20)}\n\n` +
    `▫️ <b>نام و نام خانوادگی:</b> ${escapeHtml(data.fullName)}\n` +
    `▫️ <b>تاریخ تولد:</b> ${birthday}\n` +
    `▫️ <b>ایمیل:</b> ${escapeHtml(data.email)}\n` +
    `\n${'─'.repeat(20)}\n👤 درخواست‌کننده: ${nameLink}${usernameLine}`
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: AppleAccountBody;
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

  const fullName = body.fullName?.trim() ?? '';
  const birthDay = body.birthDay?.trim() ?? '';
  const birthMonth = body.birthMonth?.trim() ?? '';
  const birthYear = body.birthYear?.trim() ?? '';
  const email = body.email?.trim() ?? '';

  const missing: string[] = [];
  if (!fullName) missing.push('fullName');
  const dayNum = Number(birthDay);
  if (!birthDay || !Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31) missing.push('birthDay');
  const monthNum = Number(birthMonth);
  if (!birthMonth || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) missing.push('birthMonth');
  if (!birthYear) missing.push('birthYear');
  if (!email || !EMAIL_RE.test(email)) missing.push('email');
  if (missing.length > 0) {
    return NextResponse.json({ ok: false, error: 'incomplete', missing }, { status: 400 });
  }

  const handlerId = process.env.APPLE_ACCOUNT_HANDLER_ID;
  if (!handlerId) {
    console.error('[apple-account] APPLE_ACCOUNT_HANDLER_ID is not set');
    return NextResponse.json({ ok: false, error: 'not configured' }, { status: 500 });
  }

  try {
    const user = parseUser(initData);
    const summary = buildSummary({ fullName, birthDay, birthMonth, birthYear, email }, user);
    const replyButton = user?.username
      ? { inline_keyboard: [[{ text: '💬 پاسخ به کاربر', url: `https://t.me/${user.username}` }]] }
      : undefined;
    await sendMessage(Number(handlerId), summary, replyButton);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[apple-account]', err);
    return NextResponse.json({ ok: false, error: 'send failed' }, { status: 500 });
  }
}
